// @<COPYRIGHT>@
// ==================================================
// Copyright 2015.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awv0ViewerSettingsService
 */
import * as app from 'app';
import viewerCtxSvc from 'js/viewerContext.service';
import appCtxSvc from 'js/appCtxService';
import viewerPreferenceService from 'js/viewerPreference.service';
import AwTimeoutService from 'js/awTimeoutService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import messagingService from 'js/messagingService';
import localeSvc from 'js/localeService';

var _viewerSettingsToolAndInfoPanelCloseEventSubscription = null;
var _viewerPMIEvent = null;

var exports = {};

var Units = {
    MILLIMETERS: 1,
    CENTIMETERS: 2,
    METERS: 3,
    INCHES: 4,
    FEET: 5,
    YARDS: 6,
    MICROMETERS: 7,
    DECIMETERS: 8,
    KILOMETERS: 9,
    MILS: 10
};
/**
 * offset delta value to be used for calculating floor offset
 */
var m_offsetDelta = 0.5;

var materialData = [ { iconName: '01ShinyMetal', tooltip: getLocalizedText( 'materialTooltip1' ) },
    { iconName: '02BrushedMetal', tooltip: getLocalizedText( 'materialTooltip2' ) },
    { iconName: '03ShinyPlastic', tooltip: getLocalizedText( 'materialTooltip3' ) },
    { iconName: '04Analysis', tooltip: getLocalizedText( 'materialTooltip4' ) },
    { iconName: '05Flat', tooltip: getLocalizedText( 'materialTooltip5' ) },
    { iconName: '06RedGlossyPlastic', tooltip: getLocalizedText( 'materialTooltip6' ) },
    { iconName: '07BlueGlossyPlastic', tooltip: getLocalizedText( 'materialTooltip7' ) },
    { iconName: '08GreenGlossyPlastic', tooltip: getLocalizedText( 'materialTooltip8' ) },
    { iconName: '09GrayGlossyPlastic', tooltip: getLocalizedText( 'materialTooltip9' ) },
    { iconName: '10BlackGlossyPlastic', tooltip: getLocalizedText( 'materialTooltip10' ) },
    { iconName: '11BrownGlossyPlastic', tooltip: getLocalizedText( 'materialTooltip11' ) },
    { iconName: '12YellowGlossyPlastic', tooltip: getLocalizedText( 'materialTooltip12' ) },
    { iconName: '13TealGlossyPlastic', tooltip: getLocalizedText( 'materialTooltip13' ) },
    { iconName: '14WhiteGlossyPlastic', tooltip: getLocalizedText( 'materialTooltip14' ) },
    { iconName: '15ClearPlastic', tooltip: getLocalizedText( 'materialTooltip15' ) },
    { iconName: '16Chrome', tooltip: getLocalizedText( 'materialTooltip16' ) },
    { iconName: '17Copper', tooltip: getLocalizedText( 'materialTooltip17' ) },
    { iconName: '18Gold', tooltip: getLocalizedText( 'materialTooltip18' ) },
    { iconName: '19Brass', tooltip: getLocalizedText( 'materialTooltip19' ) },
    { iconName: '20Steel', tooltip: getLocalizedText( 'materialTooltip20' ) },
    { iconName: '21BrushedChrome', tooltip: getLocalizedText( 'materialTooltip21' ) },
    { iconName: '22BrushedAluminum', tooltip: getLocalizedText( 'materialTooltip22' ) },
    { iconName: '23Titanium', tooltip: getLocalizedText( 'materialTooltip23' ) },
    { iconName: '24Glass', tooltip: getLocalizedText( 'materialTooltip24' ) },
    { iconName: '25SmokeyGlass', tooltip: getLocalizedText( 'materialTooltip25' ) },
    { iconName: '26RedPaint', tooltip: getLocalizedText( 'materialTooltip26' ) },
    { iconName: '27GrayPaint', tooltip: getLocalizedText( 'materialTooltip27' ) },
    { iconName: '28BlackPaint', tooltip: getLocalizedText( 'materialTooltip28' ) },
    { iconName: '29BluePaint', tooltip: getLocalizedText( 'materialTooltip29' ) },
    { iconName: '30Rubber', tooltip: getLocalizedText( 'materialTooltip30' ) }
];

/**
 * Viewer settings panel revealed
 *
 * @function viewerSettingsPanelRevealed
 *
 * @param {Object} shadedProp shaded property
 * @param {Object} walkProp walk property
 * @param {Object} useIndexedProp useIndexed property
 * @param {Object} modelTitleProp modelTitle property
 * @param {Object} unitTextProp unitText property
 * @param {Object} localeTextBundle localized text
 * @param {Object} renderSourceServer renderSourceServer property
 * @param {Object} renderSourceClient renderSourceClient property
 *
 */
export let viewerSettingsPanelRevealed = function( shadedProp, walkProp, useIndexedProp, modelTitleProp, unitTextProp, localeTextBundle, renderSourceServer, renderSourceClient, modelName, materialProp ) {
    var strRevProp = null;
    var currentLocation = null;
    var currentSubLoc = null;
    if( appCtxSvc.ctx.locationContext ) {
        currentLocation = appCtxSvc.ctx.locationContext[ 'ActiveWorkspace:Location' ];
        currentSubLoc = appCtxSvc.ctx.locationContext[ 'ActiveWorkspace:SubLocation' ];
        if( appCtxSvc.ctx.locationContext.modelObject ) {
            strRevProp = appCtxSvc.ctx.locationContext.modelObject.props.structure_revisions;
        }
    }
    if( !_.isUndefined( currentLocation ) && !_.isNull( currentLocation ) && _.isEqual( currentLocation,
            'com.siemens.splm.client.search.SearchLocation' ) ||
        !_.isUndefined( currentLocation ) && !_.isNull( currentLocation ) && !_.isUndefined( currentSubLoc ) &&
        !_.isNull( currentSubLoc ) &&
        _.isEqual( currentLocation, 'com.siemens.splm.clientfx.tcui.xrt.showObjectLocation' ) && _.isEqual(
            currentSubLoc, 'showObject' ) ||
        !_.isUndefined( strRevProp ) && !_.isNull( strRevProp ) && _.isEmpty( strRevProp.getDisplayValue() ) ) {
        shadedProp.dbValue[ 0 ].isVisible = true;
        shadedProp.dbValue[ 0 ].isChecked = viewerPreferenceService.getShadedWithEdgesPreference();
    }
    var promise = viewerCtxSvc.getPMISettings( appCtxSvc.ctx.viewer.activeViewerCommandCtx );
    promise.then( function( returnObject ) {
        var hasPMI = returnObject.hasPMIData;
        if( hasPMI ) {
            viewerCtxSvc.getInPlane( appCtxSvc.ctx.viewer.activeViewerCommandCtx ).then( function( inPlane ) {
                appCtxSvc.updatePartialCtx( 'viewer.preference.pmiChecked', inPlane );
                if( !inPlane ) {
                    eventBus.publish( 'viewerSettings.showPMIFlatToScreenTrue', {} );
                    exports.setPMIFaltToScreen( true );
                } else {
                    eventBus.publish( 'viewerSettings.showPMIFlatToScreenFalse', {} );
                }
            } );
        }
    } );
    _subscribeForViewerSettingsPanelCloseEvent();
    walkProp.dbValue[ 0 ].isVisible = navigator.userAgent.indexOf( 'iPad' ) < 0; // not supported on ipad
    let hasAlternatePCI = viewerCtxSvc.getViewerApplicationContext( appCtxSvc.ctx.viewer.activeViewerCommandCtx,
        viewerCtxSvc.VIEWER_HAS_ALTERNATE_PCI_TOKEN );
    if( hasAlternatePCI ) {
        useIndexedProp.dbValue[ 0 ].isVisible = true;
        let alternatePCI = viewerPreferenceService.getUseAlternatePCIPreference();
        if( alternatePCI === 'INDEXED' ) {
            useIndexedProp.dbValue[ 0 ].isChecked = true;
        } else {
            useIndexedProp.dbValue[ 0 ].isChecked = false;
        }
    } else {
        useIndexedProp.dbValue[ 0 ].isVisible = false;
    }
    var modelUnit = viewerPreferenceService.getModelUnit();
    var displayUnit = viewerPreferenceService.getDisplayUnit();
    for( var key in Units ) {
        if( Units[ key ] === modelUnit ) {
            modelTitleProp.uiValue = localeTextBundle[ key.toLowerCase() ];
        }
        if( Units[ key ] === displayUnit ) {
            unitTextProp.propertyDisplayName = localeTextBundle[ key.toLowerCase() ];
        }
    }
    var renderSource = viewerPreferenceService.getRenderSource();
    if( renderSource[ 0 ] === 'SSR' ) {
        renderSourceServer.dbValue[ 0 ].isChecked = true;
        renderSourceClient.dbValue[ 0 ].isChecked = false;
    } else if( renderSource[ 0 ] === 'CSR' ) {
        renderSourceServer.dbValue[ 0 ].isChecked = false;
        renderSourceClient.dbValue[ 0 ].isChecked = true;
    }
    var viewerCurrProdCtx = viewerCtxSvc.getViewerApplicationContext( appCtxSvc.ctx.viewer.activeViewerCommandCtx,
        viewerCtxSvc.VIEWER_CURRENT_PRODUCT_CONTEXT_TOKEN );
    var currentProductProperties = viewerCurrProdCtx.props;
    modelName.propertyDisplayName = currentProductProperties.object_name !== undefined ? currentProductProperties.object_name.dbValues[ 0 ] : currentProductProperties.object_string.dbValues[ 0 ];

    materialProp.dbValue[ 0 ].iconName = materialData[ parseInt( materialProp.dbValue[ 0 ].materialIndex ) ].iconName;
    materialProp.dbValue[ 0 ].tooltip = materialData[ parseInt( materialProp.dbValue[ 0 ].materialIndex ) ].tooltip;
    materialProp.propertyDisplayName = materialData[ parseInt( materialProp.dbValue[ 0 ].materialIndex ) ].tooltip;

    return {
        shadedProp: shadedProp,
        walkProp: walkProp,
        useIndexedProp: useIndexedProp,
        modelTitleProp: modelTitleProp,
        unitTextProp: unitTextProp,
        renderSourceServer: renderSourceServer,
        renderSourceClient: renderSourceClient,
        modelName: modelName,
        materialProp: materialProp
    };
};

/**
 * Set shaded mode in viewer
 *
 * @function shadedWithEdgesSettingChanged
 *
 * @param {boolean} isChecked - true if checked
 */
export let shadedWithEdgesSettingChanged = function( isChecked ) {
    viewerCtxSvc.setShadedMode( appCtxSvc.ctx.viewer.activeViewerCommandCtx, isChecked ? 1 : 0 );
};

/**
 * Apply true shading material in viewer
 *
 * @function materialSettingChanged
 *
 * @param {boolean} isChecked - true if checked
 */
export let materialSettingChanged = function( isChecked ) {
    viewerCtxSvc.applyTrueShadingMaterials( appCtxSvc.ctx.viewer.activeViewerCommandCtx, isChecked );
};

/**
 * Set trihedron setting for viewer
 *
 * @function trihedronSettingChanged
 *
 * @param {boolean} isChecked - true if checked
 */
export let trihedronSettingChanged = function( isChecked ) {
    viewerCtxSvc.setTrihedron( appCtxSvc.ctx.viewer.activeViewerCommandCtx, isChecked );
};

/**
* Reset render source option on user cancellation
*
* @function renderSourceChangeCancelled
*
* @param {Object} renderSourceServer - render Source server property
* @param {Object} renderSourceClient - render Source client property

* @returns {Object} renderSourceServer - render Source server property
* @returns {Object} renderSourceClient - render Source client property
*/
export let renderSourceChangeCancelled = function( renderSourceServer, renderSourceClient ) {
    if( renderSourceClient.dbValue[ 0 ].isChecked === true ) {
        renderSourceServer.dbValue[ 0 ].isChecked = true;
        renderSourceClient.dbValue[ 0 ].isChecked = false;
    } else if( renderSourceServer.dbValue[ 0 ].isChecked === true ) {
        renderSourceServer.dbValue[ 0 ].isChecked = false;
        renderSourceClient.dbValue[ 0 ].isChecked = true;
    }
    return {
        renderSourceServer: renderSourceServer,
        renderSourceClient: renderSourceClient
    };
};

/**
 * changing the render source on user confirmation
 *
 * @function renderSourceChangeSuccess
 *
 * @param {Object} renderSourceServer - render Source server property
 * @param {Object} renderSourceClient - render Source client property
 */
export let renderSourceChangeSuccess = function( renderSourceServer, renderSourceClient ) {
    if( renderSourceServer.dbValue[ 0 ].isChecked === true ) {
        viewerPreferenceService.setRenderSource( 'SSR' );
        eventBus.publish( 'viewerSettings.renderSourceChanged' );
    } else if( renderSourceClient.dbValue[ 0 ].isChecked === true ) {
        viewerPreferenceService.setRenderSource( 'CSR' );
        eventBus.publish( 'viewerSettings.renderSourceChanged' );
    }
};

/**
 *  set render source as server in UI
 *
 * @function renderSourceChangedServer
 *
 * @param {boolean} isChecked - true if checked
 * @param {Object} renderSourceClient - renderSourceClient property
 */
export let renderSourceChangedServer = function( isChecked, renderSourceClient, renderSourceServer, showWarningDialog ) {
    let viewerCurrCtx = viewerCtxSvc.getRegisteredViewerContext( appCtxSvc.ctx.viewer.activeViewerCommandCtx );
    if( isChecked ) {
        renderSourceClient.dbValue[ 0 ].isChecked = false;
    } else {
        if(  viewerCurrCtx.isMMVRendering() ) {
            showWarningDialog.dbValue = false;
            renderSourceServer.dbValue[ 0 ].isChecked = true;
            renderSourceClient.dbValue[ 0 ].isChecked = false;
        } else{
            renderSourceClient.dbValue[ 0 ].isChecked = true;
        }
    }
    return {
        renderSourceClient: renderSourceClient,
        renderSourceServer:renderSourceServer,
        showWarningDialog:showWarningDialog
    };
};

/**
 *  set render source as client in UI
 *
 * @function renderSourceChangedClient
 *
 * @param {boolean} isChecked - true if checked
 * @param {Object} renderSourceServer - renderSourceServer property
 */
export let renderSourceChangedClient = function( isChecked, renderSourceServer, renderSourceClient, showWarningDialog ) {
    let viewerCurrCtx = viewerCtxSvc.getRegisteredViewerContext( appCtxSvc.ctx.viewer.activeViewerCommandCtx );
    if( isChecked ) {
        if( viewerCurrCtx.isMMVRendering() ) {
            showWarningDialog.dbValue = false;
            messagingService.showInfo( viewerCurrCtx.getThreeDViewerMsg( 'mmvDataNotViewable' ) );
            renderSourceServer.dbValue[ 0 ].isChecked = true;
            renderSourceClient.dbValue[ 0 ].isChecked = false;
        } else {
            renderSourceServer.dbValue[ 0 ].isChecked = false;
        }
    } else {
            renderSourceServer.dbValue[ 0 ].isChecked = true;
    }
    return {
        renderSourceServer: renderSourceServer,
        renderSourceClient:renderSourceClient,
        showWarningDialog:showWarningDialog
    };
};

/**
 * Set floor setting for viewer
 *
 * @function showFloorSettingChanged
 *
 * @param {boolean} isChecked - true if checked
 */
export let showFloorSettingChanged = function( isChecked ) {
    viewerCtxSvc.setFloorVisibility( appCtxSvc.ctx.viewer.activeViewerCommandCtx, isChecked );
};

/**
 * Set grid setting for viewer
 *
 * @function gridSettingChanged
 *
 * @param {boolean} isChecked - true if checked
 */
export let gridSettingChanged = function( isChecked ) {
    viewerCtxSvc.setGridVisibility( appCtxSvc.ctx.viewer.activeViewerCommandCtx, isChecked );
};

/**
 * Set shadow setting for viewer
 *
 * @function shadowSettingChanged
 *
 * @param {boolean} isChecked - true if checked
 */
export let shadowSettingChanged = function( isChecked ) {
    viewerCtxSvc.setShadowVisibility( appCtxSvc.ctx.viewer.activeViewerCommandCtx, isChecked );
};

/**
 * Set reflection setting for viewer
 *
 * @function reflectionSettingChanged
 *
 *
 * @param {boolean} isChecked - true if checked
 */
export let reflectionSettingChanged = function( isChecked ) {
    viewerCtxSvc.setReflectionVisibility( appCtxSvc.ctx.viewer.activeViewerCommandCtx, isChecked );
};

/**
 * Set navigation 3D mode for viewer
 *
 * @function examineSettingChanged
 *
 * @param {boolean} isChecked - true if checked
 * @param {Object} walkProp - walk property
 */
export let examineSettingChanged = function( isChecked, walkProp ) {
    if( isChecked ) {
        viewerCtxSvc.setNavigation3Dmode( appCtxSvc.ctx.viewer.activeViewerCommandCtx, 'EXAMINE' );
        walkProp.dbValue[ 0 ].isChecked = false;
    } else {
        viewerCtxSvc.setNavigation3Dmode( appCtxSvc.ctx.viewer.activeViewerCommandCtx, 'WALK' );
        walkProp.dbValue[ 0 ].isChecked = true;
    }
    return {
        walkProp: walkProp
    };
};

/**
 * Set navigation 3D mode for viewer
 *
 * @function walkSettingChanged
 *
 * @param {boolean} isChecked - true if checked
 * @param {Object} examineProp - examine property
 */
export let walkSettingChanged = function( isChecked, examineProp ) {
    if( isChecked ) {
        viewerCtxSvc.setNavigation3Dmode( appCtxSvc.ctx.viewer.activeViewerCommandCtx, 'WALK' );
        examineProp.dbValue[ 0 ].isChecked = false;
    } else {
        viewerCtxSvc.setNavigation3Dmode( appCtxSvc.ctx.viewer.activeViewerCommandCtx, 'EXAMINE' );
        examineProp.dbValue[ 0 ].isChecked = true;
    }
    return {
        examineProp: examineProp
    };
};

/**
 * Update Material widget
 */
export let updateMaterialWidget = function( eventData, materialProp ) {
    if( eventData.index === null ) {
        return materialProp;
    }
    if( eventData.index !== materialProp.dbValue[ 0 ].materialIndex ) {
        materialProp.dbValue[ 0 ].iconName = materialData[ parseInt( eventData.index ) ].iconName;
        materialProp.dbValue[ 0 ].tooltip = materialData[ parseInt( eventData.index ) ].tooltip;
        materialProp.propertyDisplayName = materialData[ parseInt( eventData.index ) ].tooltip;
        materialProp.dbValue[ 0 ].materialIndex = eventData.index;
        viewerCtxSvc.setGlobalMaterial( appCtxSvc.ctx.viewer.activeViewerCommandCtx, eventData.index );
        return materialProp;
    }
};

/**
 * Handle slider change event
 *
 * @function handleSliderChangeEvent
 *
 * @param {Number} sliderValue - new slider value
 * @param {Object} floorSliderProp - slider property
 */
export let handleSliderChangeEvent = function( sliderValue, floorSliderProp ) {
    var currentOffset = parseFloat( appCtxSvc.getCtx( 'viewer.preference.AWC_visFloorOffset' ) );
    var newOffsetValue = null;
    if( sliderValue > 50 ) {
        newOffsetValue = currentOffset + m_offsetDelta;
    } else if( sliderValue < 50 ) {
        newOffsetValue = currentOffset - m_offsetDelta;
    }
    if( newOffsetValue !== null ) {
        viewerCtxSvc.setFloorOffset( appCtxSvc.ctx.viewer.activeViewerCommandCtx, newOffsetValue );
        if( floorSliderProp !== null ) {
            AwTimeoutService.instance( function() {
                floorSliderProp.dbValue[ 0 ].sliderOption.value = 50;
            }, 0 );
        }
    }

    return floorSliderProp;
};

/**
 * Handle floor plane change event
 *
 * @function viewerFloorPlaneChanged
 *
 * @param {String} planeId - new viewer plane id
 */
export let viewerFloorPlaneChanged = function( planeId ) {
    viewerCtxSvc.setFloorOrientation( appCtxSvc.ctx.viewer.activeViewerCommandCtx, planeId );
};

/**
 * Set selection display highlight
 *
 * @param {Object} useTransparencyProp
 */
export let updateSelectionDisplayHighlight = function( useTransparencyProp ) {
    if( useTransparencyProp === null ) {
        return useTransparencyProp;
    }
    useTransparencyProp.dbValue[ 0 ].isChecked = false;

    return useTransparencyProp;
};

/**
 * Set pmi flat to screen visibility to false
 *
 * @param {Object} pmiProp
 */
export let updateShowPMIFlatToScreenFalse = function( pmiProp ) {
    if( pmiProp === null ) {
        return pmiProp;
    }
    pmiProp.dbValue[ 0 ].isVisible = true;
    pmiProp.dbValue[ 0 ].isChecked = false;

    return pmiProp;
};

/**
 * Set pmi flat to screen visibility to true
 *
 * @param {Object} pmiProp
 */
export let updateShowPMIFlatToScreenTrue = function( pmiProp ) {
    if( pmiProp === null ) {
        return pmiProp;
    }
    pmiProp.dbValue[ 0 ].isVisible = true;
    pmiProp.dbValue[ 0 ].isChecked = true;

    return pmiProp;
};

/**
 * Set selection display transparent
 *
 * @param {Object} useTransparencyProp
 */
export let updateSelectionDisplayTransparent = function( useTransparencyProp ) {
    if( useTransparencyProp === null ) {
        return useTransparencyProp;
    }
    useTransparencyProp.dbValue[ 0 ].isChecked = true;

    return useTransparencyProp;
};

/**
 * Set selection display mode
 *
 * @param {String} viewerSettingValue is use transparency value
 */
export let useTransparencySettingChanged = function( viewerSettingValue ) {
    viewerCtxSvc.setUseTransparency( appCtxSvc.ctx.viewer.activeViewerCommandCtx, viewerSettingValue );
};

/**
 * Set Indexed/Non-Indexed Model
 *
 * @param {Object} useIndexedProp is use Indexed Model Object
 *
 * @return {Object} useIndexedProp object with new Indexed Mode
 */
export let useIndexedSettingChanged = function( useIndexedProp ) {
    var optionValue = useIndexedProp.dbValue[ 0 ].isChecked ? 'INDEXED' : 'NON_INDEXED';
    viewerPreferenceService.setUseAlternatePCIPreference( optionValue );
    eventBus.publish( 'viewerSettings.useIndexedModelSettingchanged' );
};

/**
 * To set PMI flat to screen
 *
 * @param {Boolean} setFlatToScreen - Boolean flag to indicate if PMI should be set flat to screen or not.
 */
export let setPMIFaltToScreen = function( setFlatToScreen ) {
    viewerCtxSvc.setFlatPMI( appCtxSvc.ctx.viewer.activeViewerCommandCtx, setFlatToScreen );
};

/**
 * to set display unit
 */
export let setDisplayUnit = function( selectedUnit, localeTextBundle ) {
    var selDisplayUnit = Object.keys( localeTextBundle ).find( function( key ) {
        return localeTextBundle[ key ] === selectedUnit;
    } );
    var unitConst = Units[ selDisplayUnit.toUpperCase() ];
    viewerPreferenceService.setDisplayUnit( unitConst );
    viewerCtxSvc.setDisplayUnit( appCtxSvc.ctx.viewer.activeViewerCommandCtx, unitConst );
};

/**
 * Subscribe for viewer settings panel close event
 */
var _subscribeForViewerSettingsPanelCloseEvent = function() {
    if( _viewerSettingsToolAndInfoPanelCloseEventSubscription === null ) {
        _viewerSettingsToolAndInfoPanelCloseEventSubscription = eventBus.subscribe( 'appCtx.register', function(
            eventData ) {
            if( eventData.name === 'activeToolsAndInfoCommand' ) {
                _unSubscribeForViewerSettingsPanelCloseEvent();
            }
        }, 'Awv0ViewerSettingsService' );
    }
};

/**
 * Unsubscribe for viewer settings panel close event
 */
var _unSubscribeForViewerSettingsPanelCloseEvent = function() {
    if( _viewerSettingsToolAndInfoPanelCloseEventSubscription !== null ) {
        eventBus.unsubscribe( _viewerSettingsToolAndInfoPanelCloseEventSubscription );
        _viewerSettingsToolAndInfoPanelCloseEventSubscription = null;
    }
};

/**
 * Get the localized text for given key
 *
 * @param {String} key Key for localized text
 * @return {String} The localized text
 */
function getLocalizedText( key ) {
    var localeTextBundle = getLocaleTextBundle();
    return localeTextBundle[ key ];
}

/**
 * This method finds and returns an instance for the locale resource.
 *
 * @return {Object} The instance of locale resource if found, null otherwise.
 */
function getLocaleTextBundle() {
    var resource = 'ViewerSettingsToolMessages';
    var localeTextBundle = localeSvc.getLoadedText( resource );
    if( localeTextBundle ) {
        return localeTextBundle;
    }
    return null;
}

export default exports = {
    viewerSettingsPanelRevealed,
    shadedWithEdgesSettingChanged,
    materialSettingChanged,
    trihedronSettingChanged,
    renderSourceChangeCancelled,
    renderSourceChangeSuccess,
    renderSourceChangedServer,
    renderSourceChangedClient,
    showFloorSettingChanged,
    gridSettingChanged,
    shadowSettingChanged,
    reflectionSettingChanged,
    examineSettingChanged,
    walkSettingChanged,
    updateMaterialWidget,
    handleSliderChangeEvent,
    viewerFloorPlaneChanged,
    updateSelectionDisplayHighlight,
    updateShowPMIFlatToScreenFalse,
    updateShowPMIFlatToScreenTrue,
    updateSelectionDisplayTransparent,
    useTransparencySettingChanged,
    useIndexedSettingChanged,
    setPMIFaltToScreen,
    setDisplayUnit
};
/**
 * This factory creates a service and returns exports
 *
 * @member Awv0ViewerSettingsService
 * @memberof NgServices
 */
app.factory( 'Awv0ViewerSettingsService', () => exports );
