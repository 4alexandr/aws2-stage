// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module propRenderTemplates/Crt1ParameterResultStatus
 */

import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import appCtxService from 'js/appCtxService';

var exports = {};

/**
 * Generates Parameter Result Status DOM Element
 * @param { Object } vmo - ViewModelObject for which parameter result status is being rendered
 * @param { Object } containerElem - The container DOM Element inside which parameter result status will be rendered
 */

export let parameterResultStatusFn = function( vmo, containerElem ) {
    var result = null;
    var resultForCrt0Result = null;
    var inOut = null;
    if( vmo.props && vmo.props.att1Result && vmo.props.att1Result.dbValue ) {
        result = vmo.props.att1Result.dbValue;
    }
    if( vmo.props && vmo.props.att1AttrContext && vmo.props.att1AttrContext.dbValue ) {
        var attrContext = vmo.props.att1AttrContext.dbValue;
        if( attrContext ) {
            var attrContextModelObject = cdm.getObject( attrContext );

            if( attrContextModelObject &&
                attrContextModelObject.props &&
                attrContextModelObject.props.crt0Result &&
                attrContextModelObject.props.crt0Result.dbValues ) {
                resultForCrt0Result = attrContextModelObject.props.crt0Result.dbValues[ 0 ];
            }
        }
    }
    if( vmo.props && vmo.props.att1AttrInOut && vmo.props.att1AttrInOut.dbValue ) {
        inOut = vmo.props.att1AttrInOut.dbValue;
    }

    var color = document.createElement( 'div' );
    color.className = 'aw-visual-indicator';
    color.style.backgroundSize = '500px 500px';
    var colorSrc = null;
    var OutputDirection = appCtxService.ctx.output;
    if( inOut === OutputDirection && result === '100' && resultForCrt0Result === '100' ) {
        color.innerHTML = vmo.props.att1Result.displayValues[0];
        colorSrc = '#50bed7';
        color.style.width = '43px';
        color.style.textAlign = 'center';
        color.style.color = 'white';
        color.title = 'Result Overridden';
    } else if( inOut === OutputDirection  && result === '200' && resultForCrt0Result === '200' ) {
        color.innerHTML = vmo.props.att1Result.displayValues[0];
        colorSrc = '#50bed7';
        color.style.width = '43px';
        color.style.textAlign = 'center';
        color.style.color = 'white';
        color.title = 'Result Overridden';
    } else if( inOut === OutputDirection  && result === '100' ) {
        color.innerHTML = vmo.props.att1Result.displayValues[0];
        colorSrc = '#DC0000';
        color.style.width = '43px';
        color.style.textAlign = 'center';
        color.style.color = 'white';
    } else if( inOut === OutputDirection  && result === '200' ) {
        color.innerHTML = vmo.props.att1Result.displayValues[0];
        colorSrc = '#0A9B00';
        color.style.width = '43px';
        color.style.textAlign = 'center';
        color.style.color = 'white';
    }
    color.style.backgroundColor = colorSrc;

    containerElem.appendChild( color );
};

export let resultStatusFn = function( vmo, containerElem ) {
    var resultDisplayValue;
    if( vmo.props && vmo.props.crt1Result && vmo.props.crt1Result.dbValue ) {
        var result = vmo.props.crt1Result.dbValue;
        resultDisplayValue = vmo.props.crt1Result.displayValues[0];
    } else if( vmo.props && vmo.props.crt0Result && vmo.props.crt0Result.dbValue ) {
        var result = vmo.props.crt0Result.dbValue;
        resultDisplayValue = vmo.props.crt0Result.displayValues[0];
    }
    var color = document.createElement( 'div' );
    color.className = 'aw-visual-indicator';
    color.style.backgroundSize = '500px 500px';
    var colorSrc = null;
    if( result === '100' ) {
        color.innerHTML = resultDisplayValue;
        colorSrc = '#DC0000';
        color.style.width = '43px';
        color.style.textAlign = 'center';
        color.style.color = 'white';
    } else if( result === '200' ) {
        color.innerHTML = resultDisplayValue;
        colorSrc = '#0A9B00';
        color.style.width = '43px';
        color.style.textAlign = 'center';
        color.style.color = 'white';
    }
    color.style.backgroundColor = colorSrc;

    containerElem.appendChild( color );
};

export let measuredValFn = function( vmo, containerElem ) {
    var color = document.createElement( 'div' );
    color.className = 'aw-visual-indicator';
    color.style.backgroundSize = '500px 500px';

    if( appCtxService.ctx.xrtSummaryContextObject &&
        appCtxService.ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) > -1 ||
        appCtxService.ctx.openedARObject &&
        appCtxService.ctx.openedARObject.modelType.typeHierarchyArray.indexOf( 'Crt0VldnContractRevision' ) > -1 ) {
        var maxValue = null;
        var minValue = null;
        var measuredValue = null;
        if( vmo.props && vmo.props[ 'REF(att1SourceAttribute,Att0MeasurableAttributeDbl).att0Max' ] &&
           vmo.props[ 'REF(att1SourceAttribute,Att0MeasurableAttributeDbl).att0Max' ].dbValue ) {
            maxValue = vmo.props[ 'REF(att1SourceAttribute,Att0MeasurableAttributeDbl).att0Max' ].dbValue;
        }
        if( vmo.props && vmo.props[ 'REF(att1SourceAttribute,Att0MeasurableAttributeDbl).att0Min' ] &&
            vmo.props[ 'REF(att1SourceAttribute,Att0MeasurableAttributeDbl).att0Min' ].dbValue ) {
            minValue = vmo.props[ 'REF(att1SourceAttribute,Att0MeasurableAttributeDbl).att0Min' ].dbValue;
        }
        if( vmo.props && vmo.props[ 'REF(att1SourceAttribute,Att0MeasurableAttributeDbl).REF(att0CurrentValue,Att0MeasureValueDbl).att0Value' ] &&
            vmo.props[ 'REF(att1SourceAttribute,Att0MeasurableAttributeDbl).REF(att0CurrentValue,Att0MeasureValueDbl).att0Value' ].uiValue ) {
            measuredValue = vmo.props[ 'REF(att1SourceAttribute,Att0MeasurableAttributeDbl).REF(att0CurrentValue,Att0MeasureValueDbl).att0Value' ].uiValue;
        }
        color.style.color = 'red';
        if( minValue === null && maxValue === null || vmo.props[ 'REF(att1SourceAttribute,Att0MeasurableAttributeDbl).att0Max' ].type === 'STRING' && vmo.props[
                'REF(att1SourceAttribute,Att0MeasurableAttributeDbl).att0Min' ].type === 'STRING' || measuredValue >= minValue && measuredValue <= maxValue ) {
            color.style.color = 'black';
        }
    } else if( vmo.type === 'Att1AttributeAlignmentProxy' && vmo.props && vmo.props.att1SourceAttribute && vmo.props.att1SourceAttribute.dbValues[ 0 ] ) {
        color.style.color = 'black';
        var sourceElement = cdm.getObject( vmo.props.att1SourceAttribute.dbValues[ 0 ] );
        if( sourceElement && sourceElement.modelType.typeHierarchyArray.indexOf( 'Att0MeasurableAttribute' ) > -1 ) {
            if( vmo.props && vmo.props[ 'REF(att1SourceAttribute,Att0MeasurableAttributeDbl).REF(att0CurrentValue,Att0MeasureValueDbl).att0Value' ] ) {
                measuredValue = vmo.props[ 'REF(att1SourceAttribute,Att0MeasurableAttributeDbl).REF(att0CurrentValue,Att0MeasureValueDbl).att0Value' ].uiValue;
            }
        }
    }
    if( !measuredValue ) {
        color.innerHTML = '';
    } else {
        color.innerHTML = measuredValue;
    }
    containerElem.appendChild( color );
};

export default exports = {
    parameterResultStatusFn,
    resultStatusFn,
    measuredValFn
};
app.factory( 'Crt1ParameterResultStatus', () => exports );
