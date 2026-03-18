// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 $$
 */

/**
 * Directive to display the gantt in AW.
 * @module js/aw-gantt.directive
 * @requires app
 */

import app from 'app';
import ganttManager from 'js/uiGanttManager';
import 'js/aw-gantt.controller';
import 'dhtmlxgantt_smart_rendering';
import 'js/aw-right-click.directive';
import eventBus from 'js/eventBus';

app.directive( 'awGantt', function() {
    return {
        restrict: 'E',
        replace: false,
        scope: {
            ganttid: '@'
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-gantt.directive.html',
        controller: 'awGanttCtrl',
        link: function( $scope, $element, $attr, $controller ) {
            var processorPromise = $controller.initializeProcessorClass();
            processorPromise.then( function() {
                var dataProvider = $controller.readDataProvider( $scope );
                var providerPromise = $controller.readGanttConfigAndPrepareProvider( $scope, $element );
                providerPromise.then( function() {
                    ganttManager.getGanttInstance().keep_grid_width = true;
                    ganttManager.getGanttInstance().config.columns = $scope.ganttColumns;
                    var ganttTasks = dataProvider.viewModelCollection.loadedVMObjects[ 0 ];
                    if ( !dataProvider.viewModelCollection || !ganttTasks ) {
                        ganttTasks = [];
                    }
                    let ganttLinks = [];
                    if( dataProvider.viewModelCollection.loadedVMObjects[ 1 ] ) {
                        ganttLinks = dataProvider.viewModelCollection.loadedVMObjects[ 1 ];
                    }
                    var ganttData = {
                        data : ganttTasks,
                        links: ganttLinks
                    };

                    var height = $controller.getGanttHeight();
                    var ganttWrapper;
                    var htmlElems = $element[0].getElementsByClassName( 'aw-ganttInterface-ganttWrapper' );
                    if( htmlElems.length > 0 ) {
                        ganttWrapper = htmlElems[0];
                    }else{
                        ganttWrapper = $element[ 0 ].firstElementChild;
                    }
                    //remove this when SCSS is fixed
                    $element[ 0 ].firstElementChild.style.height = '19px';
                    $element[ 0 ].firstElementChild.style.width = '100%';

                    ganttWrapper.style.height = height + 'px';
                    $scope.ganttWrapperHTMLElement = ganttWrapper;

                    $controller.prepareGanttCustomisations();
                    $controller.addResizeListener( ganttWrapper );

                    var eventData = $controller.prepareCalendarForGantt();
                    eventData.forEach( function( event ) {
                        ganttManager.getGanttInstance().setWorkTime( event );
                    } );
                    $controller.setupDates();

                    var startTime = new Date().getTime();

                    ganttManager.getGanttInstance().init( ganttWrapper );

                    var endTime = new Date().getTime();
                    var delta = endTime - startTime;
                    var total = ganttTasks.length;
                    ganttManager.debugMessage( '1. Total time for init ' + total + ' objects took ' + delta +
                        ' milliseconds' );

                    startTime = new Date().getTime();

                    ganttManager.getGanttInstance().parse( ganttData, 'json' );

                    endTime = new Date().getTime();
                    delta = endTime - startTime;
                    total = ganttTasks.length;
                    ganttManager.debugMessage( '2. Total time for parse ' + total + ' objects took ' + delta +
                        ' milliseconds' );

                    dataProvider.ganttInitialized = true;
                    eventBus.publish( 'UpdateTaskIndexIds' );
                    eventBus.publish( 'showGanttSummary' );
                } );
            } );

            $scope.$on( '$destroy', function() {
                $controller.cleanup();
                ganttManager.destroyGanttInstance();
            } );
        }
    };
} );
