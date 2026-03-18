// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * This module contains a controller that handles prompting for Geography. This is a special case that is option, but
 * during the authentication process. Part of the Stage2 processing.
 *
 * @module js/pick.geography.controller
 * @class angular_module
 * @memberOf angular_module
 */
import app from 'app';
import logger from 'js/logger';
import 'js/sessionManager.service';
import 'js/localeService';
import 'js/geographyData.service';

'use strict';

app.controller( 'PickGeography', [
    '$scope',
    '$state',
    'localeService',
    'geographyDataService',
    'sessionManagerService',
    function( $scope, $state, localeSvc, geoDataSvc, sessionMgrSvc ) {

        // list of countries
        $scope.geographyList = [];

        // which of the list entries (if any) are picked
        $scope.selectedGeography = '';

        $scope.continueBtnVisibility = false; // hide to start
        // is there confidentiality data to display?
        $scope.displayConfidentialSection = false;

        // checkbox state.
        $scope.checkboxModel = {}; // issue with checkbox binding state
        $scope.checkboxModel.confidentialCheckMarkState = false; // unchecked

        // pick up client side UI localizations.
        localeSvc.getTextPromise( 'geographyMessages' ).then(
            function( localTextBundle ) {
                $scope.brandName = localTextBundle.BRAND_NAME;
                $scope.signOutBtnText = localTextBundle.SIGN_OUT_TEXT;
                $scope.continueBtnText = localTextBundle.CONTINUE_TEXT;
                $scope.geographySectionTitle = localTextBundle.GEOGRAPHY_SECTION_TITLE;
                $scope.geographySectionPrompt = localTextBundle.GEOGRAPHY_SECTION_PROMPT;
                $scope.confidentialSectionTitle = localTextBundle.CONFIDENTIAL_SECTION_TITLE;
                $scope.confidentialCheckBoxLabel = localTextBundle.CONFIDENTIAL_CHECKBOX_LABEL;
                $scope.initialListEntryLabel = localTextBundle.INITIAL_LIST_VALUE;
            } );

        /**
         * function to evaluate whether or not the Continue action should be shown
         */
        var evalContinueStatus = function() {

            // under what conditions should the continue button be made visible.
            // 1) user has picked a geography
            // 2) if the confidentiality area is to be displayed, then checkmark must be selected.
            var showContinue = false; // assume not

            if( $scope.selectedGeography && $scope.selectedGeography.value &&
                $scope.selectedGeography.name !== $scope.initialListEntryLabel ) {

                // there is a country picked
                if( $scope.displayConfidentialSection ) {

                    // displaying the confidential section, so include checkmark
                    if( $scope.checkboxModel.confidentialCheckMarkState ) {
                        showContinue = true;
                    }
                } else {
                    // not displaying the confidential section, and we have a geography choice
                    showContinue = true;
                }
            }

            // modify the state
            $scope.continueBtnVisibility = showContinue;
        };

        // go get data from the data service
        geoDataSvc.getServerGeographyData().then( function( data ) {
            $scope.confidentialStatementText = data.confidentialText;

            if( $scope.confidentialStatementText && $scope.confidentialStatementText !== '' ) {
                $scope.displayConfidentialSection = true;
            }

            for( var key in data.countryList ) {
                var obj = {};
                obj.name = key;
                obj.value = data.countryList[ key ];
                $scope.geographyList.push( obj );
            }

            if( data.initialCountryValue !== '' ) {

                // get the entry that corresponds to the user preference
                // pick an existing entry
                var geographyListSize = $scope.geographyList.length;
                var found = 0;
                for( found = 0; found < geographyListSize; found++ ) {
                    if( $scope.geographyList[ found ].value === data.initialCountryValue ) {
                        $scope.selectedGeography = $scope.geographyList[ found ];
                        break;
                    }
                }
                evalContinueStatus();
            } else {

                // no user pref, put the "Required" option in the list as the selected one.
                // put the required text in
                var requiredInputOpt = {
                    name: $scope.initialListEntryLabel, // check timing issue with LocaleService
                    value: ''
                };
                $scope.geographyList.unshift( requiredInputOpt );
                $scope.selectedGeography = requiredInputOpt;
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
            logger.log( "ERROR - no continuation available for the pipleline controller" );
        }

        /**
         * action handler binding for checkbox state change.
         */
        $scope.checkBoxClick = function() {
            evalContinueStatus();
        };

        /**
         * event handler binding for selection in the geography list
         */
        $scope.listpickChange = function() {
            evalContinueStatus();
        };

        /**
         * function binding for the continue on action
         */
        $scope.continueOn = function() {
            // prior to continuing - see if the user changed their default country.
            var uiChoice = $scope.selectedGeography.value;
            geoDataSvc.saveNewGeography( uiChoice ); // send modified key to server
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
    }
] );
