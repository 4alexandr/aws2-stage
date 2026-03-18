// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 *
 *
 * @module js/prm1AddViewToGatewayService
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import dmSvc from 'soa/dataManagementService';
import messagingSvc from 'js/messagingService';
import soaSvc from 'soa/kernel/soaService';
import policySvc from 'soa/kernel/propertyPolicyService';
import _ from 'lodash';

var exports = {};

/**
 *
 * @param {object} ctx context object
 * @param {object} param object uid
 * @param {string} prop property name
 * @returns {string} dispName
 */
function makeTileDisplayName( data, ctx, param, prop ) {
    var dispName = data.i18n.gatewayTileTitle + ':';
    var separator;
    if( ctx.paramCompareViewContext.compareType === 'ProjectParamComparison' ) {
        separator = ',';
    } else {
        separator = '#';
    }
    var tbtElem = ctx.state.params.sel_uids.split( separator );
    _.forEach( tbtElem, function( uid ) {
        var obj = cdm.getObject( uid );
        if( obj && obj.props && obj.props.object_name ) {
            dispName += obj.props.object_name.uiValues[ '0' ] + '; ';
        } else if( obj.props.object_string ) {
            dispName += obj.props.object_string.uiValues[ '0' ] + '; ';
        }
    } );
    var uids = typeof ctx.state.params[ param ] === 'string' ? ctx.state.params[ param ].split( separator ) : [];
    _.forEach( uids, function( uid ) {
        var obj = cdm.getObject( uid );
        if( obj && obj.props && obj.props[ prop ] ) {
            dispName += obj.props[ prop ].uiValues[ 0 ] + '; ';
        }
    } );
    return dispName;
}

/**
 * Method to call SOA to create tile in gateway
 * @param {Object} ctx context object
 * @param {String} successMsg notification msg
 */
export let pinToGateway = function( data, ctx, successMsg ) {
    var tileTemplateId;
    var dispNameAddlObjsParam;
    var dispNameAddlObjsProp;
    if( ctx.paramCompareViewContext.compareType === 'ProjectParamComparison' ) {
        tileTemplateId = 'Prm1ParameterCompareTemplate';
        dispNameAddlObjsParam = 'rv_uids';
        dispNameAddlObjsProp = 'object_name'; // ujwala: This need to change as per comparable object
    } else if( ctx.paramCompareViewContext.compareType === 'ProductParamComparison' ) {
        tileTemplateId = 'Prm1ParameterCompareTemplate';
        if( ctx.state.params.vrs_uids !== null ) {
            dispNameAddlObjsParam = 'vrs_uids';
        } else {
            dispNameAddlObjsParam = 'rcp_uids';
        }
        dispNameAddlObjsProp = 'object_name';
    } else {
        return;
    }
    // This is overkill, but all of the gateway stuff is GWT in AW3.4, and
    // we don't have access to any of what has already been loaded.
    soaSvc.post('Internal-AWS2-2018-05-DataManagement', 'getCurrentUserGateway2', {}).then(function (gatewayResponse) {

        var tileRelUid = _.get(gatewayResponse, 'tileGroups[0].tiles[0].relUID');
        if (tileRelUid) {
            var relsToLoad = [];
            var tileGroup = _.find(gatewayResponse.tileGroups, 'groupName', 'Pinnedtiles');
            if (!tileGroup) {
                tileGroup = _.last(gatewayResponse.tileGroups);
            }
            var lastPinnedRelUid = _.get(_.last(tileGroup.tiles), 'relUID');
            var lastPinnedOrderNo = _.get(_.last(tileGroup.tiles), 'orderNumber');
            if (lastPinnedRelUid) {
                relsToLoad.push(lastPinnedRelUid);
            }
            if (ctx.paramCompareViewContext.compareType === 'ProductParamComparison') {
                var tbtElem = ctx.state.params.sel_uids.split('#');
                _.forEach(tbtElem, function (uid) {
                    relsToLoad.push(uid);
                });
            }
            var policyId = policySvc.register({
                types: [{
                    name: 'Awp0GatewayTileRel',
                    properties: [{
                        name: 'primary_object'
                    }]
                }]
            });
            dmSvc.loadObjects(relsToLoad).then(function () {
                var tileRel = cdm.getObject(lastPinnedRelUid);
                var tileCollectionUid = _.get(tileRel, 'props.primary_object.dbValues[0]');
                if (tileCollectionUid) {
                    var dispName = makeTileDisplayName(data, ctx, dispNameAddlObjsParam, dispNameAddlObjsProp);
                    var paramIdx = window.location.hash ? window.location.hash.indexOf('?') : -1;
                    if (paramIdx < 0) {
                        return;
                    }
                    var params = window.location.hash.substring(paramIdx);
                    dmSvc.createObjects([{
                        data: {
                            boName: 'Awp0Tile',
                            stringProps: {
                                awp0TileTemplateId: tileTemplateId,
                                object_name: dispName,
                                awp0DisplayName: dispName,
                                awp0Params: params
                            }
                        }
                    }]).then(function (response) {
                        dmSvc.createObjects([{
                            data: {
                                boName: 'Awp0GatewayTileRel',
                                stringProps: {
                                    awp0Group: 'Pinnedtiles'
                                },
                                intProps: {
                                    awp0OrderNo: lastPinnedOrderNo,
                                    awp0Size: 0
                                },
                                tagProps: {
                                    primary_object: cdm.getObject(tileCollectionUid),
                                    secondary_object: cdm.getObject(response.output[0].objects[0].uid)
                                }
                            }
                        }]).then(function () {
                            messagingSvc.showInfo(successMsg);
                            policySvc.unregister( policyId );
                        });
                    });
                }
            });
        }
    });

};

export default exports = {
    pinToGateway
};
app.factory( 'prm1AddViewToGatewayService', () => exports );
