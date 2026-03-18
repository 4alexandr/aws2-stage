// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 *
 *
 * @module js/Evm1PropertyRenderer
 * @requires app
 */
import app from 'app';
import AwRootScopeService from 'js/awRootScopeService';
import AwInjectorService from 'js/awInjectorService';
import $ from 'jquery';

var exports = {};

var _loadViewAndAppendIcon = function( viewToRender, vmo, containerElem, propName ) {
    AwInjectorService.instance.invoke( [ 'panelContentService',
        'viewModelService', '$compile',
        function( panelContentService, panelViewModelService, compile ) {
            panelContentService.getPanelContent( viewToRender ).then(
                function( viewAndViewModelResponse ) {
                    panelViewModelService.populateViewModelPropertiesFromJson( viewAndViewModelResponse.viewModel )
                        .then( function( declarativeViewModel ) {
                            var scope = AwRootScopeService.instance.$new();
                            var element = $( viewAndViewModelResponse.view );

                            declarativeViewModel[ propName + 'Data' ].dbValue = vmo.props[ propName ].dbValue;
                            declarativeViewModel[ propName + 'Data' ].isEditable = vmo.props[ propName ].isEditable;
                            declarativeViewModel[ propName + 'Data' ].isEnabled = vmo.props[ propName ].isEnabled;
                            declarativeViewModel.vmo = vmo;
                            panelViewModelService.setupLifeCycle( scope, declarativeViewModel );
                            element.appendTo( containerElem );
                            compile( element )( scope );
                        } );
                } );
        }
    ] );
};

/**
 * Generates DOM Element for evm1Include
 * @param {Object} vmo - ViewModelObject for which element config is being rendered
 * @param {Object} containerElem - The container DOM Element inside which element config will be rendered
 * @param {String} propName - the name of property to render
 */
export let propertyRendererFunc = function( vmo, containerElem, propName ) {
    var _propertyToBeRendered = vmo.props && vmo.props[ propName ];
    var viewToRender = propName + 'Renderer';
    if( _propertyToBeRendered ) {
        _loadViewAndAppendIcon( viewToRender, vmo, containerElem, propName );
    }
};

export default exports = {
    propertyRendererFunc
};
app.factory( 'Evm1PropertyRenderer', () => exports );
