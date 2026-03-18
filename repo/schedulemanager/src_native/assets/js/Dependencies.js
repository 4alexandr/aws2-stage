//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 */

/**
 * @module js/Dependencies
 */
import app from 'app';
import ClipboardService from 'js/clipboardService';
import appCtxService from 'js/appCtxService';
import cmm from 'soa/kernel/clientMetaModel';

var exports = {};

export let getDependencies = function() {
    var newDependencies = [];
    var sourceObjectNames = '';
    var selectedObjectName = [];
    var sourceObjects = ClipboardService.instance.getContents();
    var len = appCtxService.ctx.awClipBoardProvider.length - 1;
    var clipboardLength = String( len );
    for( var sel = 0; sel < appCtxService.ctx.mselected.length; sel++) {
        for( var object in sourceObjects ) {
            if( cmm.isInstanceOf( 'ScheduleTask', sourceObjects[ object ].modelType )
            /**
             * &&
             * appCtxService.ctx.selected.type ==
             * "ScheduleTask"
             */
            ) {
            newDependencies.push( {
                predTask: sourceObjects[ object ],
                succTask: appCtxService.ctx.mselected[sel],
                depType: 0,
                lagTime: 0
            } );
            if( object === clipboardLength ) {
                sourceObjectNames += sourceObjects[ object ].props.object_name.dbValues[ 0 ];
            } else {
                sourceObjectNames = sourceObjectNames + sourceObjects[ object ].props.object_name.dbValues[ 0 ] +
                    '", "';
            }
        } else {
            throw 'createDependencyErrorMsg';
        }
    }
    selectedObjectName.push(appCtxService.ctx.mselected[sel].props.object_name.dbValues[ 0 ]);
    }
    return {
        newDependencies: newDependencies,
        sourceObjectNames: sourceObjectNames,
        selectedObjectName: selectedObjectName
    };
};

exports = {
    getDependencies
};

export default exports;
app.factory( 'Dependencies', () => exports );
