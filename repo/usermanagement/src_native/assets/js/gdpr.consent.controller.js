// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * This module contains a controller that handles prompting for GDPR Consent Page. This is a special case
 * that is option, but during the authentication process. Part of the Stage2 processing.
 *
 * @module js/gdpr.consent.controller
 * @class angular_module
 * @memberOf angular_module
 */
import app from 'app';
import logger from 'js/logger';
import 'js/sessionManager.service';
import 'js/localeService';
import 'js/gdprConsentData.service';

'use strict';

app.controller( 'GDPRConsent', [
    '$scope',
    '$state',
    'localeService',
    'gdprConsentDataService',
    'sessionManagerService',
    function( $scope, $state, localeSvc, showGDPRSvc, sessionMgrSvc ) {

        $scope.continueBtnVisibility = false; // hide to start

        // checkbox state.
        $scope.checkboxModel = {}; // issue with checkbox binding state
        $scope.checkboxModel.gdprCheckMarkState = false; // unchecked

        // pick up client side UI localizations.
        localeSvc.getTextPromise( 'geographyMessages' ).then(
            function( localTextBundle ) {
                $scope.brandName = localTextBundle.BRAND_NAME;
                $scope.gdprCheckBoxLabel = localTextBundle.GDPR_CHECKBOX_LABEL;
                $scope.continueBtnText = localTextBundle.CONTINUE_TEXT;
                $scope.signOutBtnText = localTextBundle.SIGN_OUT_TEXT;
            } );

        /**
         * function to evaluate whether or not the Continue action should be shown
         */
        var evalContinueStatus = function() {

            // under what conditions should the continue button be made visible.
            var showContinue = false;

            if( $scope.checkboxModel.gdprCheckMarkState ) {
                showContinue = true;
            }
            $scope.continueBtnVisibility = showContinue;
        };

        // go get data from the data service
        showGDPRSvc.getGDPRConsentStatement().then( function( data ) {

            document.getElementById( "ConsentStatement" ).innerHTML = data.consentStatementTextData;

            if( data.consentStatementTextData && data.consentStatementTextData !== '' ) {
                $scope.displayGDPRSection = true;
            }
        }, function() {
            //
        } );

        /**
         * member to hold the continuation promise in the execution flow.
         */
        var nextContinuation;

        // assertion is that the session manager populated this data member with
        // the continuation.
        if( $state.current.data && $state.current.data.nextContinuation ) {
            nextContinuation = $state.current.data.nextContinuation;
        } else {
            logger.info( "ERROR - no continuation available for the pipleline controller" );
        }

        /**
         * function binding for the continue on action
         */
        $scope.continueOn = function() {
            showGDPRSvc.recordUserConsent( true );
            nextContinuation.resolve();
        };

        /**
         * function binding for the sign out action
         */
        $scope.signOut = function() {
            // create a failure object with reason code?  What to pass along for exit reason?
            nextContinuation.reject( {
                'cancel': true
            } );
            sessionMgrSvc.terminateSession();
        };

        /**
         * action handler binding for checkbox state change.
         */
        $scope.checkBoxClick = function() {
            evalContinueStatus();
        };
    }
] );
