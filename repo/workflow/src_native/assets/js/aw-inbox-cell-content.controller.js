// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * The controller for inbox cell content
 *
 * @module js/aw-inbox-cell-content.controller
 * @requires app
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/aw.inbox.service';

'use strict';

/**
 * The controller for the aw-inbox-cell-content directive
 *
 * @class InboxCellContentCtrl
 * @param clientDataModel {Object} - Client data model
 * @memberof NgControllers
 */
app.controller( 'InboxCellContentCtrl', [ '$scope', 'awInboxService', function( $scope, awInboxSvc ) {

    var ctrl = this;

    /**
     * If the object currently loaded is modified update the title
     *
     * @method handleObjectsModifiedListener
     * @memberOf InboxCellContentCtrl
     */
    ctrl.handleObjectsModifiedListener = function() {

        //Add listener
        var onObjectsModifiedListener = eventBus.subscribe( "cdm.modified", function( data ) {
            if( $scope.vmo && data.modifiedObjects && data.modifiedObjects.length > 0 ) {

                //If the something about the task attached to our VMO changes
                var validEPMTask = awInboxSvc.getValidEPMTaskObject( $scope.vmo.uid );
                data.modifiedObjects.forEach( function( mo ) {
                    if( validEPMTask && mo && mo.uid === validEPMTask.uid ) {
                        $scope.$evalAsync( function() {
                            //Update unread on the scope.
                            $scope.isUnRead = !awInboxSvc.checkTaskViewedByMe( mo );
                        } );
                    }
                } );
            }
        } );

        //And remove it when the scope is destroyed
        $scope.$on( '$destroy', function() {
            eventBus.unsubscribe( onObjectsModifiedListener );
        } );
    };

    /**
     * Update isUnRead on the scope to bold / unbold title.
     *
     * @method handleObjectsModifiedListener
     * @memberOf InboxCellContentCtrl
     */
    ctrl.updateIsUnread = function() {
        if( $scope.vmo ) {
            var validEPMTaskObject = awInboxSvc.getValidEPMTaskObject( $scope.vmo.uid );

            if( validEPMTaskObject ) {
                $scope.isUnRead = !awInboxSvc.checkTaskViewedByMe( validEPMTaskObject );
            }
        }
    };
} ] );
