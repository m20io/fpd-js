import '../../ui/view/ViewsNav.js';

import { 
    addEvents,
    deepMerge,
    objectHasKeys,
    pixelToUnit,
    removeElemClasses,
    toggleElemClasses,
    unitToPixel
} from '../../helpers/utils';
import Snackbar from '../view/comps/Snackbar.js';

export default class ViewsNav extends EventTarget {

    #maxStageSize = 1000; //when adding blank page or editing size, this will be max. canvas width/height
    #pbOffset = 50;
    
    constructor(fpdInstance) {
        
        super();
        
        this.fpdInstance = fpdInstance;
        this.container = document.createElement("fpd-views-nav");
        this.unitFormat = fpdInstance.mainOptions.dynamicViewsOptions.unit;
		this.minWidth = fpdInstance.mainOptions.dynamicViewsOptions.minWidth;
		this.minHeight = fpdInstance.mainOptions.dynamicViewsOptions.minHeight;
		this.maxWidth = fpdInstance.mainOptions.dynamicViewsOptions.maxWidth;
		this.maxHeight = fpdInstance.mainOptions.dynamicViewsOptions.maxHeight;

        fpdInstance.mainWrapper.container.append(this.container);

        let editSizeWrapper = null;
        if(Boolean(fpdInstance.mainOptions.enableDynamicViews)) {

            editSizeWrapper = this.container.querySelector('.fpd-view-edit-size');
            removeElemClasses(editSizeWrapper, ['fpd-hidden']);

            const inputWidth = editSizeWrapper.querySelector('[data-type="width"]');
            inputWidth.setAttribute('aria-label', this.minWidth+this.unitFormat + ' - ' + this.maxWidth+this.unitFormat)
            inputWidth.setAttribute('placeholder', this.minWidth+this.unitFormat + ' - ' + this.maxWidth+this.unitFormat);

            const inputHeight = editSizeWrapper.querySelector('[data-type="height"]');
            inputHeight.setAttribute('aria-label', this.minHeight+this.unitFormat + ' - ' + this.maxHeight+this.unitFormat)
            inputHeight.setAttribute('placeholder', this.minHeight+this.unitFormat + ' - ' + this.maxHeight+this.unitFormat);
            

        }

        addEvents(
            fpdInstance,
            ['viewCreate', 'viewRemove'],
            (evt) => {

                this.container.querySelector('.fpd-total-views').innerText = fpdInstance.viewInstances.length;

            }
        )

        addEvents(
            fpdInstance,
            ['viewSelect'],
            (evt) => {

                toggleElemClasses(
                    this.container.querySelector('.fpd-view-locker'),
                    ['fpd-hidden'],
                    !fpdInstance.currentViewInstance.options.optionalView
                )

                this.container.querySelector('.fpd-current-view').innerText = fpdInstance.currentViewIndex + 1; 

                this.#toggleViewLock(fpdInstance.currentViewInstance);

                if(editSizeWrapper) {

                    const viewInstance = fpdInstance.currentViewInstance;

                    let viewWidthUnit = pixelToUnit(viewInstance.options.stageWidth, this.unitFormat),
					    viewHeightUnit = pixelToUnit(viewInstance.options.stageHeight, this.unitFormat);

                    //check if canvas output is set
                    if(objectHasKeys(viewInstance.options.output, ['width', 'height'])) {
                        viewWidthUnit = viewInstance.options.output.width;
                        viewHeightUnit = viewInstance.options.output.height;                        
                    }
                    
                    const inputWidth = editSizeWrapper.querySelector('[data-type="width"]');
                    const inputHeight = editSizeWrapper.querySelector('[data-type="height"]');

                    inputWidth.min = this.minWidth;
                    inputWidth.max = this.maxWidth;
                    inputWidth.value = viewWidthUnit;

                    inputHeight.min = this.minHeight;
                    inputHeight.max = this.maxHeight;
                    inputHeight.value = viewHeightUnit;

                }

            }
        )
        

        addEvents(
            this.container.querySelector('.fpd-view-prev'),
            'click',
            (evt) => {

                fpdInstance.selectView(fpdInstance.currentViewIndex - 1);

            } 
        )

        addEvents(
            this.container.querySelector('.fpd-view-next'),
            'click',
            (evt) => {

                fpdInstance.selectView(fpdInstance.currentViewIndex + 1);

            } 
        )

        addEvents(
            this.container.querySelector('.fpd-show-views-grid'),
            'click',
            (evt) => {

                fpdInstance.deselectElement();

                toggleElemClasses(
                    fpdInstance.viewsGrid.container,
                    ['fpd-show'],
                    true
                )

            } 
        )
        
        addEvents(
            this.container.querySelector('.fpd-view-locker'),
            'click',
            (evt) => {

                if(fpdInstance.currentViewInstance) {

                    fpdInstance.deselectElement();
                    fpdInstance.currentViewInstance.toggleLock(!fpdInstance.currentViewInstance.locked);  
                    this.#toggleViewLock(fpdInstance.currentViewInstance);  
                    
                    if(!fpdInstance.currentViewInstance.locked) {

                        Snackbar(
                            fpdInstance.translator.getTranslation(
                                'misc', 
                                'view_unlocked_info', 
                                'The view is unlocked'
                            )
                        );

                    }
                    

                }        

            } 
        )

        //edit size
        if(editSizeWrapper) {
    
            addEvents(
                editSizeWrapper.querySelectorAll('input'),
                'change',
                (evt) => {

                    const inputElem = evt.currentTarget;
                    this.checkDimensionLimits(inputElem.dataset.type, inputElem);
                    
                    const viewInstance = fpdInstance.currentViewInstance;
                                        
                    let widthPx = unitToPixel(editSizeWrapper.querySelector('[data-type="width"]').value, this.unitFormat),
                        heightPx = unitToPixel(editSizeWrapper.querySelector('[data-type="height"]').value, this.unitFormat);
                        
                    let viewOptions = this.calcPageOptions(widthPx, heightPx);
                    viewInstance.options = deepMerge(viewInstance.options, viewOptions);                            
                    viewInstance.fabricCanvas.viewOptions = viewInstance.options;
    
                    viewInstance.fabricCanvas._renderPrintingBox();
                    viewInstance.fabricCanvas.resetSize();
                    
                    this.doPricing(viewInstance);                                          
                    
                }
            )

        }
        
    }

    #toggleViewLock(viewInstance) {

        const viewLocker = this.container.querySelector('.fpd-view-locker');

        toggleElemClasses(
            viewLocker.querySelector('.fpd-icon-locked'),
            ['fpd-hidden'],
            !viewInstance.locked
        )

        toggleElemClasses(
            viewLocker.querySelector('.fpd-icon-unlocked'),
            ['fpd-hidden'],
            viewInstance.locked
        )

    }

    checkDimensionLimits(type, input) {

		if(type == 'width') {

			if(input.value < this.minWidth) { input.value = this.minWidth; }
			else if(input.value > this.maxWidth) { input.value = this.maxWidth; }

		}
		else {

			if(input.value < this.minHeight) { input.value = this.minHeight; }
			else if(input.value > this.maxHeight) { input.value = this.maxHeight; }

		}        

		return input.value;

	}

    calcPageOptions(widthPx, heightPx) {

        let aspectRatio = Math.min((this.#maxStageSize - this.#pbOffset) / widthPx,  (this.#maxStageSize - this.#pbOffset) / heightPx);
        const pbWidth = parseInt(widthPx * aspectRatio);
        const pbHeight = parseInt(heightPx * aspectRatio);

        let viewOptions = {
            stageWidth: pbWidth+this.#pbOffset,
            stageHeight: pbHeight+this.#pbOffset,
            printingBox: {
                width: pbWidth,
                height: pbHeight,
                left: ((pbWidth+this.#pbOffset) / 2) - (pbWidth / 2),
                top: ((pbHeight+this.#pbOffset) / 2) - (pbHeight / 2),
                visibility: true
            },
            usePrintingBoxAsBounding: true,
            output: {
                width: pixelToUnit(widthPx, 'mm'),
                height: pixelToUnit(heightPx, 'mm')
            }
        };

        return viewOptions;

    }

    doPricing(viewInstance) {
        
        if(viewInstance && this.fpdInstance.mainOptions.dynamicViewsOptions.pricePerArea) {

            let width = pixelToUnit(viewInstance.options.stageWidth, this.unitFormat),
                height = pixelToUnit(viewInstance.options.stageHeight, this.unitFormat);

            //check if canvas output is set
            if(objectHasKeys(viewInstance.options.output, ['width', 'height'])) {
                width = unitToPixel(viewInstance.options.output.width, "mm");
                width = pixelToUnit(width, this.unitFormat)
                height = unitToPixel(viewInstance.options.output.height, "mm");
                height = pixelToUnit(height, this.unitFormat)
            }

            let unit2 = Math.ceil(width * height),
                unit2Price = unit2 * Number(this.fpdInstance.mainOptions.dynamicViewsOptions.pricePerArea);
                            
            viewInstance.changePrice(0, '+', unit2Price);

        }

    }

}