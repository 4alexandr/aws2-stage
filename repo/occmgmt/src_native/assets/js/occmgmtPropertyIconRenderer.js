// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 *
 *
 * @module js/occmgmtPropertyIconRenderer
 * @requires app
 */
import app from 'app';
import AwRootScopeService from 'js/awRootScopeService';
import AwInjectorService from 'js/awInjectorService';
import appCtxService from 'js/appCtxService';
import $ from 'jquery';

var exports = {};

var setPCIOnVmo = function( containerElem ) {
    var parent = containerElem.offsetParent ? $( containerElem.offsetParent ).scope() : null;
    if( parent ) {
        while( !parent.subPanelContext && parent !== null ) {
            parent = parent.$parent;
        }
        if( parent.subPanelContext ) {
            return appCtxService.ctx[ parent.subPanelContext.viewKey ].productContextInfo.uid;
        }
    }
    return null;
};

var _loadViewAndAppendIcon = function( viewToRender, vmo, containerElem, propName ) {
    AwInjectorService.instance.invoke( [ 'panelContentService',
        'viewModelService', '$compile',
        function( panelContentService, panelViewModelService, compile ) {
            panelContentService.getPanelContent( viewToRender ).then(
                function( viewAndViewModelResponse ) {
                    panelViewModelService.populateViewModelPropertiesFromJson( viewAndViewModelResponse.viewModel )
                        .then( function( declarativeViewModel ) {
                            var scope = AwRootScopeService.instance.$new();

                            declarativeViewModel.vmoHovered = vmo;
                            declarativeViewModel.vmoHovered.vmoPciUid = setPCIOnVmo( containerElem );
                            declarativeViewModel.propHovered = propName;

                            panelViewModelService.setupLifeCycle( scope, declarativeViewModel );
                            var element = $( viewAndViewModelResponse.view );
                            element.appendTo( containerElem );
                            compile( element )( scope );
                        } );
                } );
        }
    ] );
};

/**
 * Generates DOM Element for awb0HasInContextOverrides
 * @param { Object } vmo - ViewModelObject for which element config is being rendered
 * @param { Object } containerElem - The container DOM Element inside which element config will be rendered
 */
export let propertyIconRenderer = function( vmo, containerElem, propName ) {
    var _propertyToBeRendered = vmo.props && vmo.props[ propName ] && vmo.props[ propName ].dbValue;
    var viewToRender = propName + 'Renderer';
    if( _propertyToBeRendered ) {
        _loadViewAndAppendIcon( viewToRender, vmo, containerElem, propName );
    }
};

export let overriddenPropRenderer = function( vmo, containerElem, propName ) {
    var _contextList = null;
    var _propList = null;
    if( vmo.props && vmo.props.awb0OverrideContexts && vmo.props.awb0OverriddenProperties ) {
        _contextList = vmo.props.awb0OverrideContexts.dbValues;
        _propList = vmo.props.awb0OverriddenProperties.dbValues;
        for( var idx = 0; idx < _contextList.length; idx++ ) {
            var _prop = _propList[ idx ];
            if( _prop === propName ) {
                var overrideContext = _prop + 'Context';
                if( !vmo.overrideContexts ) {
                    vmo.overrideContexts = {};
                }
                vmo.overrideContexts[ overrideContext ] = _contextList[ idx ];
                containerElem.title = "";
                _loadViewAndAppendIcon( 'awb0OverridenPropertyRenderer', vmo, containerElem, propName );
                break;
            }
        }
    }
};

export default exports = {
    propertyIconRenderer,
    overriddenPropRenderer
};
app.factory( 'occmgmtPropertyIconRenderer', () => exports );
