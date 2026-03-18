// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */


    /**
     * Directive to display hint
     *
     * @module js/aw-prgschedulemanager-hint.directive
     * @example <aw-prgschedulemanager-hint hint="myhint"></aw-prgschedulemanager-hint>
     *
     * @member aw-prgschedulemanager-hint
     * @memberof NgElementDirectives
     */


 import app from 'app';


     'use strict';
    app.directive('awPrgschedulemanagerHint',
        [function(){
            return{
                restrict: 'E',
                scope: {
                    hint: '='
                },
                templateUrl: app.getBaseUrlPath() + '/html/aw-prgschedulemanager-hint.directive.html'
            };
    }]);
 