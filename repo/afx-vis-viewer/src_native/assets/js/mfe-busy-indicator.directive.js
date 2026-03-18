// Copyright (c) 2020 Siemens
import Debug from 'Debug';
import app from 'app';

const trace = new Debug( 'vis-web-viewer:mfe-busy-indicator:' );
/**
 * Creates overlay a busy indicator over its parent block element.
 * @module js/mfe-busy-indicator.directive
 * @example
 * <mfe-busy-indicator show='true' message='some text'></mfe-busy-indicator>
 *
 * @innerDOM
 * <div class="mfe-busy-indicator-container">
 *    <div class="mfe-busy-indicator"></div>
 *    <div class="mfe-busy-indicator-message">message</div>
 * </div>
 * */
const attributes = {
    show: 'show',
    message: 'message'
};
const css = `
.hide{
  display:none;
}
.show{
    display:flex;
}

.mfe-busy-indicator-container {
    display:flex;
    flex-direction:column;
    align-items: center;
}
:host{
    position: absolute;
    z-index: 9;
    left: 0;
    top: 0;
    bottom: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: none;
}

.mfe-busy-indicator{
    height: 33.76px;
    width: 33.76px;
    overflow:hidden;
    background:url(${app.getBaseUrlPath()}/image/miscSessionProgressNeutral32.svg) no-repeat center;
    animation:spin 1s infinite linear;
}
 @keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}
`;
// background:url(image/miscSessionProgressNeutral32.svg);
class MfeBusyIndicator extends HTMLElement {
    constructor() {
        super();
        this.container = document.createElement( 'div' );


        this.indicator = document.createElement( 'div' );
        this.indicator.setAttribute( 'class', 'mfe-busy-indicator' );
        this.container.appendChild( this.indicator );


        this.message = document.createElement( 'div' );
        this.container.appendChild( this.message );


        const style = document.createElement( 'style' );
        style.textContent = css;

        const shadowDOM = this.attachShadow( { mode: 'open' } );
        shadowDOM.appendChild( style );
        shadowDOM.appendChild( this.container );
    }

    static get observedAttributes() {
        return [ attributes.show, attributes.message ];
    }

    attributeChangedCallback( name, oldValue, newValue ) {
        if ( attributes.message === name ) {
            this.message.textContent = newValue;
        }
        if ( attributes.show === name ) {
            //update the visibility
            if ( newValue === 'true' || newValue === true ) {
                this.container.setAttribute( 'class', 'show mfe-busy-indicator-container' );
                trace( this.parentElement.getBoundingClientRect() );
                const dim = this._calculateDimOfIndicator();
                if ( dim ) {
                    this.indicator.style.height = `${dim.height}px`;
                    this.indicator.style.width = `${dim.width}px`;
                }
            } else {
                this.container.setAttribute( 'class', 'hide' );
            }
        }
    }
    connectedCallback() {
        trace( 'connectedCallback' );
        this._parentElementPosition = this.parentElement.style.position;
        this.parentElement.style.position = 'relative';
    }
    disconnectedCallback() {
        this.parentElement.style.position = this._parentElementPosition;
        trace( 'disconnectedCallback' );
    }
    _calculateDimOfIndicator() {
        const rect = this.parentElement.getBoundingClientRect();
        const width = rect.width * 0.1;
        const height = rect.height * 0.1;
        return {
            width: width > 33 ? width : 33,
            height: height > 33 ? height : 33
        };
    }
}

window.customElements.define( 'mfe-busy-indicator', MfeBusyIndicator );
