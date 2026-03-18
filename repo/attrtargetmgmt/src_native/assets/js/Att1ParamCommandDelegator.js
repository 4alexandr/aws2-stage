// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
  define
 */

/**
 * @module js/Att1ParamCommandDelegator
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import cmm from 'soa/kernel/clientMetaModel';
import TypeDisplayNameService from 'js/typeDisplayName.service';
import eventBus from 'js/eventBus';
import localeService from 'js/localeService';
import selectionService from 'js/selection.service';
import _ from 'lodash';

var exports = {};

export let att1RegisterCreateChange = function() {
    var selectedObjs = _.get( appCtxSvc, 'ctx.parammgmtctx.mselected', undefined );
    if( selectedObjs ) {
        var appSelectedObjects = {
            appSelectedObjects: selectedObjs
        };
        appCtxSvc.registerCtx( 'appCreateChangePanel', appSelectedObjects );
    }
};

export let att1RegisterCreateTraceLink = function() {
    var selectedObjs = _.get( appCtxSvc, 'ctx.parammgmtctx.mselected', undefined );
    if( selectedObjs ) {
        var sourceObjects = {
            sourceObject: selectedObjs
        };
        appCtxSvc.registerCtx( 'rmTracelinkPanelContext', sourceObjects );
    }
};

export let att1RegisterGnerateReport = function() {
    var selectedObjs = _.get( appCtxSvc, 'ctx.mselected', undefined );
    if( selectedObjs ) {
        _.forEach( selectedObjs, function( obj ) {
            if( obj.props && obj.props.att1SourceAttribute ) {
                obj.props.awb0UnderlyingObject = obj.props.att1SourceAttribute;
            }
        } );
    }
};

/**
 *Parameter Management UtilService
 */

export default exports = {
    att1RegisterCreateChange,
    att1RegisterCreateTraceLink,
    att1RegisterGnerateReport
};
app.factory( 'Att1ParamCommandDelegator', () => exports );
