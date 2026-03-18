// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * The controller for Gantt
 *
 * @module js/aw-gantt.controller
 * @requires app
 */

import app from 'app';
import $ from 'jquery';
import ganttManager from 'js/uiGanttManager';
import 'js/appCtxService';
import 'js/viewModelService';
import 'js/awColumnService';
import declUtils from 'js/declUtils';
import eventBus from 'js/eventBus';
import 'dhtmlxgantt_marker';
import 'dhtmlxgantt_multiselect';
import 'dhtmlxgantt_tooltip';
import propPolicySvc from 'soa/kernel/propertyPolicyService';
import ganttCtxMenuService from 'js/SMGantt/ganttContextMenuService';
import AwCompileService from 'js/awCompileService';
import ngModule from 'angular';
import tcViewModelObjectService from 'js/tcViewModelObjectService';
import ganttRowEditHandlerSvc from 'js/SMGantt/ganttRowEditHandlerService';
import AwTimeoutService from 'js/awTimeoutService';

'use strict';

app.controller( 'awGanttCtrl', [ '$scope', 'appCtxService', 'viewModelService', 'awColumnService', '$q', function( $scope, appCtxService, viewModelSvc, awColumnSvc, $q ) {
    var ctrl = this;
    var _ganttScrollEvent;
    var declViewModel = viewModelSvc.getViewModel( $scope, true );
    var declGantt = declViewModel.grids[ $scope.ganttid ];
    var ganttProcessor;
    var editorElement;

    $scope.arrangeColumns = function() {
        ganttProcessor.arrangeColumns( declViewModel.columns );
    };

    ctrl.initializeProcessorClass = function() {
        var dataProcessorClass = declGantt.gridOptions.dataProcessorClass;
        var ganttProcessorPath = 'js/' + dataProcessorClass;
        var depModules = [ ganttProcessorPath ];
        var deferred = $q.defer();
        declUtils.loadDependentModules( depModules, $q, app.getInjector() ).then(
            function( depModuleObjMap ) {
                ganttProcessor = depModuleObjMap[ dataProcessorClass ];
                // ganttProcessor = ganttProcessor.instance;
                deferred.resolve();
            }
        );
        return deferred.promise;
    };

    ctrl.readDataProvider = function( $scope ) {
        var declGantt = declViewModel.grids[ $scope.ganttid ];
        var dataProvider;
        if( declGantt && declGantt.dataProvider ) {
            dataProvider = declViewModel.dataProviders[ declGantt.dataProvider ];
        }

        return dataProvider;
    };

    ctrl.readColumnProvider = function( $scope ) {
        var declGantt = declViewModel.grids[ $scope.ganttid ];
        var columnProvider;
        if( declGantt && declGantt.columnProvider ) {
            columnProvider = declViewModel.columnProviders[ declGantt.columnProvider ];
        }
        return columnProvider;
    };

    ctrl.readGanttConfigAndPrepareProvider = function( $scope, $element ) {
        $scope.ctx = appCtxService.ctx;
        if( $scope.ganttid ) {
            var declViewModel = viewModelSvc.getViewModel( $scope, true );
            var declGantt = declViewModel.grids[ $scope.ganttid ];
            if( declGantt && declGantt.dataProvider ) {
                var dataProvider = declViewModel.dataProviders[ declGantt.dataProvider ];
                var columnProvider = awColumnSvc.createColumnProvider( declViewModel, $scope,
                    dataProvider.commands, $scope.ganttid, dataProvider.json.commandsAnchor );

                $scope.dataprovider = dataProvider;
                assureCSSInitialization();
                registerEventListeners();
                $scope.ganttOptions = declGantt.gridOptions;
                declViewModel.ganttOptions = declGantt.gridOptions;
                declViewModel.ganttSourceObject = appCtxService.ctx.selected;
                return initializeProvider( dataProvider, columnProvider, declViewModel );
            }
        }
    };

    ctrl.prepareCalendarForGantt = function() {
        var eventRanges = ganttProcessor.initEventRanges();
        var dayRanges = ganttProcessor.initDayRanges();

        var calendarData = [];
        dayRanges.forEach( function( dayRange ) {
            var dayofWeek = {};
            dayofWeek.day = dayRange.day;
            var timeSlot = dayRange.hours;
            if( !timeSlot ) {
                timeSlot = [];
            }
            dayofWeek.hours = timeSlot;
            calendarData.push( dayofWeek );
        } );
        eventRanges.forEach( function( eventDay ) {
            // ganttManagerganttManager.getGanttInstance().setWorkTime( eventDay );
            calendarData.push( eventDay );
        } );
        return calendarData;
    };

    ctrl.prepareGanttCustomisations = function() {
        ganttProcessor.initGanttCustomisations( declViewModel );
        var ganttConfig = ganttProcessor.getConfigOptions();
        for( var option in ganttConfig ) {
            ganttManager.getGanttInstance().config[ option ] = ganttConfig[ option ];
        }
        var localizedLabels = ganttProcessor.getLocalizedLabels( declViewModel );
        ganttManager.getGanttInstance().locale.labels = localizedLabels;
    };

    var initializeMonthFull = function( data ) {
        var month_full = [];
        month_full.push( data.i18n.gantt_month_January );
        month_full.push( data.i18n.gantt_month_February );
        month_full.push( data.i18n.gantt_month_March );
        month_full.push( data.i18n.gantt_month_April );
        month_full.push( data.i18n.gantt_month_May );
        month_full.push( data.i18n.gantt_month_June );
        month_full.push( data.i18n.gantt_month_July );
        month_full.push( data.i18n.gantt_month_August );
        month_full.push( data.i18n.gantt_month_September );
        month_full.push( data.i18n.gantt_month_October );
        month_full.push( data.i18n.gantt_month_November );
        month_full.push( data.i18n.gantt_month_December );
        return month_full;
    };

    var initializeMonthShort = function( data ) {
        var month_short = [];
        month_short.push( data.i18n.gantt_month_Jan );
        month_short.push( data.i18n.gantt_month_Feb );
        month_short.push( data.i18n.gantt_month_Mar );
        month_short.push( data.i18n.gantt_month_Apr );
        month_short.push( data.i18n.gantt_month_May_short );
        month_short.push( data.i18n.gantt_month_Jun );
        month_short.push( data.i18n.gantt_month_Jul );
        month_short.push( data.i18n.gantt_month_Aug );
        month_short.push( data.i18n.gantt_month_Sep );
        month_short.push( data.i18n.gantt_month_Oct );
        month_short.push( data.i18n.gantt_month_Nov );
        month_short.push( data.i18n.gantt_month_Dec );
        return month_short;
    };

    var initializeDayFull = function( sunday, monday, tuesday, wednesday, thursday, friday, saturday ) {
        var day_full = [];
        day_full.push( sunday );
        day_full.push( monday );
        day_full.push( tuesday );
        day_full.push( wednesday );
        day_full.push( thursday );
        day_full.push( friday );
        day_full.push( saturday );
        return day_full;
    };

    var initializeDayShort = function( sunday, monday, tuesday, wednesday, thursday, friday, saturday ) {
        var day_short = [];
        day_short.push( sunday );
        day_short.push( monday );
        day_short.push( tuesday );
        day_short.push( wednesday );
        day_short.push( thursday );
        day_short.push( friday );
        day_short.push( saturday );
        return day_short;
    };

    var initializeDate = function( monthFull, monthShort, dayFull, dayShort ) {
        var date = {};
        date.month_full = monthFull;
        date.month_short = monthShort;
        date.day_full = dayFull;
        date.day_short = dayShort;
        return date;
    };

    /**
     * Initializes the date object for the Gantt.
     */
    ctrl.setupDates = function() {
        var data = declViewModel;
        var monthFull = initializeMonthFull( data );

        var monthShort = initializeMonthShort( data );

        var dayFull = initializeDayFull( data.i18n.gantt_day_Sunday, data.i18n.gantt_day_Monday,
            data.i18n.gantt_day_Tuesday, data.i18n.gantt_day_Wednesday, data.i18n.gantt_day_Thursday,
            data.i18n.gantt_day_Friday, data.i18n.gantt_day_Saturday );

        var dayShort = initializeDayShort( data.i18n.gantt_day_sun, data.i18n.gantt_day_mon,
            data.i18n.gantt_day_tue, data.i18n.gantt_day_wed, data.i18n.gantt_day_thu, data.i18n.gantt_day_fri,
            data.i18n.gantt_day_sat );

        return initializeDate( monthFull, monthShort, dayFull, dayShort );
    };

    ctrl.getGanttHeight = function() {
        return ganttProcessor.getGanttHeight();
    };

    ctrl.addResizeListener = function() {
        $( window ).resize( resizer );
        //And remove it when the scope is destroyed
        $scope.$on( '$destroy', function() {
            // The clean up code will go here
            //unregister the window resize event.
            $( window ).off( 'resize', resizer );
            $scope.handleRightClick = null;
        } );
    };

    /**
     * This will resize the Gantt when the screen/browser size is changed.
     */
    function resizer() {
        let height = ctrl.getGanttHeight();
        $scope.ganttWrapperHTMLElement.style.height = height + 'px';
    }

    ctrl.afterRenderCallback = function() {
        if( ganttManager.getGanttInstance().config.smart_rendering ) {
            var visibleTasks = ganttManager.getGanttInstance()._smart_render._getVisibleTasks();
            callAfterRenderCallback( visibleTasks );
        }
    };
    var scrollTimeout;
    _ganttScrollEvent = ganttManager.getGanttInstance().attachEvent(
        'onGanttScroll',
        function( left, top ) {
            clearTimeout( scrollTimeout );
            scrollTimeout = setTimeout( function() {
                ctrl.afterRenderCallback();
            }, 100 );
        } );

    var callAfterRenderCallback = function( visibleTasks ) {
        if( visibleTasks.length > 0 ) {
            let isDelayLoadProps = declGantt.gridOptions.delayLoadProperties;
            ganttProcessor.afterRenderCallback( visibleTasks, declViewModel.ganttColumns, isDelayLoadProps, declViewModel, function( ganttTaskArray ) {
                //commented for now. RefreshData() is used for testing if all the data is refreshed or not. If not we have to refresh each task
                // ganttTaskArray.forEach( function( ganttTask ) {
                //     ganttManager.getGanttInstance().refreshTask( ganttTask.id );
                // } );
                ganttManager.getGanttInstance().refreshData();
            } );
        }
    };

    ctrl.cleanup = function() {
        ganttProcessor.cleanup();
        ganttManager.getGanttInstance().detachEvent( _ganttScrollEvent );
        ganttManager.getGanttInstance()._working_time_helper.reset_calendar();

        if( $scope._gantCellDblClickListener ) {
            eventBus.unsubscribe( $scope._gantCellDblClickListener );
            $scope._gantCellDblClickListener = null;
        }

        if( ganttRowEditHandlerSvc.getEditHandler() ) {
            ganttRowEditHandlerSvc.removeEditHandler();
        }

        $( 'body' ).off( 'mousedown touchstart', $scope._bodyClickListener );
        delete $scope._bodyClickListener;

        $scope.handleRightClick = null;
        $scope.isEditing = false;
        $scope.editVMO = null;
        $scope.editVMP = null;
    };

    var assureCSSInitialization = function() {
        // This is check for CSS link which is used for gantt chart
        // styling .
        var cssCheck = $( 'head:first > link' ).filter(
            '[href=\'' + app.getBaseUrlPath() + '/lib/dhtmlxgantt/skins/dhtmlxgantt_meadow.css\']' ).length;
        if( cssCheck === 0 ) {
            /**
             * Include the CSS for 'dhxgantt' module.
             */
            var link = document.createElement( 'link' );
            link.type = 'text/css';
            link.rel = 'stylesheet';
            link.href = app.getBaseUrlPath() + '/lib/dhtmlxgantt/skins/dhtmlxgantt_meadow.css';
            var linkNode = $( 'head:first > link' );
            document.getElementsByTagName( 'head' )[ 0 ].insertBefore( link, linkNode[ 0 ] );
        }
    };

    var initializeProvider = function( dataProvider, columnProvider, declViewModel ) {
        return columnProvider.initialize().then( async function( columns ) {
            /**
             * Dont re-initialize DP if it already exists
             */
            if( columns ) {
                $scope.ganttColumns = ganttProcessor.prepareColumnsForGantt( columns, declViewModel );
            }
            if( $scope.ganttColumns && $scope.ganttColumns.length > 0 ) {
                declViewModel.ganttColumns = $scope.ganttColumns;
                declViewModel.ganttColumnMap = $scope.columnMapping;
            }
            if( dataProvider.json && dataProvider.json.firstPage ) {
                // Do Nothing
                return null;
            }
            await propPolicySvc.registerPolicyAsync( '/policies/ganttPropPolicy.json' );
            if( declViewModel.columns ) {
                var types = {};
                var typeList = [];
                declViewModel.columns.forEach( function( col ) {
                    var objectType = {};
                    var propertiesContainer = [];
                    objectType.name = col.columnSrcType;
                    propertiesContainer.push( {
                        name: col.propDescriptor.propertyName
                    } );

                    objectType.properties = propertiesContainer;
                    typeList.push( objectType );
                } );

                types.types = typeList;

                let propertyPolicyID = propPolicySvc.register( types );
            }
            // ganttPropertyPolicyPromise.then( function( policy ) {
            //     ganttPropertyPolicyID = policy;
            //     eventBus.publish( 'CallForLoadScheduleSOAEvent' );
            // } );
            return dataProvider.initialize( $scope ).then( function() {
                if( declViewModel.ganttConfigColumns && declGantt.gridOptions.columnsReturnedByDataProvider ) {
                    return ganttProcessor.getColumnsFromConfigColumns( declViewModel.ganttConfigColumns ).then( function( columns ) {
                        $scope.ganttColumns = ganttProcessor.prepareColumnsForGantt( columns, declViewModel );
                        declViewModel.ganttColumns = $scope.ganttColumns;
                        return null;
                    } );
                }
                return null;
            } );
        } );
    };

    var registerEventListeners = function( $element ) {
        eventBus.subscribe( $scope.ganttid + '.updateTasks', function( eventData ) {
            var updatedTasks = eventData.eventMap[ 'cdm.updated' ].updatedObjects;
            ganttProcessor.updateGanttObjects( eventData.eventMap, updatedTasks, declViewModel.ganttActualColumns );
        } );

        eventBus.subscribe( $scope.ganttid + '.deleteObjects', function( eventData ) {
            if( eventData.deletedObjectUids ) {
                ganttProcessor.deleteObjects( eventData.deletedObjectUids );
            }
        } );

        eventBus.subscribe( $scope.ganttid + '.createObjects', function( eventData ) {
            var createdObjects = eventData.eventMap[ 'cdm.created' ].createdObjects;
            if( createdObjects ) {
                ganttProcessor.createObjectsOnGantt( createdObjects, declViewModel );
            }
        } );
    };

    /**
     * Handles right click event on Gantt.
     * @param {Event} event - the event object
     */
    $scope.handleRightClick = function( event ) {
        // Stop and save any pending edits.
        //$scope.stopCellEdit( true );
        if( $scope.ganttid === 'ScheduleGantt' ) {
            ganttCtxMenuService.showContextMenu( event, $scope );
        }
    };

    /**
     * Start editing the gantt cell.
     *
     * @param {String} taskId UID of the task to edit.
     * @param {Object} cellNode The gantt cell to set into edit mode.
     */
    $scope.startCellEdit = function( taskId, cellNode ) {
        // Stop and save any pending edits.
        $scope.stopCellEdit( true );

        var vmo = tcViewModelObjectService.createViewModelObjectById( taskId );
        if( vmo.modelType.typeHierarchyArray.indexOf( 'Fnd0ProxyTask' ) > -1 ) {
            return;
        }
        // NOTE: Only editing of 'object_name' is supported.
        // Remove this check to extend editing for other properties.
        var editPropName = ganttRowEditHandlerSvc.getCellPropertyName( cellNode );
        let updatedName = ganttProcessor.getServerColumnName( editPropName );
        if( updatedName ) {
            editPropName = updatedName;
        }
        if( editPropName !== 'object_name' && editPropName !== 'saw1Predecessors' && editPropName !== 'saw1Successors' ) {
            return;
        }

        if( !$scope.isEditing ) {
            $scope.editVMO = vmo;
            ganttRowEditHandlerSvc.addEditHandler( $scope.editVMO );

            ganttRowEditHandlerSvc.getEditHandler().startEdit().then( function() {
                        if( editPropName === 'saw1Predecessors' || editPropName === 'saw1Successors' ) {
                            var vmoProp = ganttRowEditHandlerSvc.getViewModelPropertyForDependencyInfo( $scope.editVMO.uid, editPropName );
                            $scope.editVMO.props[ editPropName ] = vmoProp;
                        }
                        $scope.editVMP = $scope.editVMO.props[ editPropName ];
                        $scope.editVMP.autofocus = true;
                        $scope.isEditing = true;

                        //For properties added only in Client, Editable flag needs to be set
                        if( editPropName === 'saw1Predecessors' || editPropName === 'saw1Successors' ) {
                            $scope.editVMP.isEditable = true;
                            $scope.editVMP.isPropertyModifiable = true;
                        }

                        if( !$scope.editVMO.props[ editPropName ].isPropertyModifiable ) {
                            ganttRowEditHandlerSvc.removeEditHandler( true );
                            return;
                        }

                $scope._bodyClickListener = function( event ) {
                    //DO NOT process clicks inside the inline editor.
                    if( $( event.target ).closest( '.ganttInlineEditor' ).length <= 0 ) {
                        // Save the edits only if the user clicks inside the Gantt chart.
                        // Else discard the changes. This is to avoid edit helper notifications
                        // about the unsaved changes (when user clicks on the sublocation
                        // tabs or back button) triggered by '$locationChangeStart'
                        // or '$stateChangeStart' handlers at leavePlace.service.
                        var saveEdits = $( event.target ).closest( '.smgantt' ).length > 0;
                        $scope.stopCellEdit( saveEdits );
                    }
                };

                $( 'body' ).off( 'mousedown touchstart', $scope._bodyClickListener ).on(
                    'mousedown touchstart', $scope._bodyClickListener );

                AwTimeoutService.instance( () => {
                    var htmlContent = '<aw-widget class="ganttInlineEditor" prop="$parent.editVMP" labeldisplay="headless" ></aw-widget>';
                    editorElement = ngModule.element( htmlContent );

                    var childScope = $scope.$new();
                    AwCompileService.instance( editorElement )( childScope );
                    // $compile( editorElement )( childScope );

                    $( cellNode ).children().hide();
                    $( cellNode ).append( editorElement );
                    $( cellNode ).addClass( 'ganttInlineEditCell' );
                    $( cellNode ).find( '.ganttInlineEditor' ).select(); // Set cursor inside the editor.
                } );
            } );
        }
    };

    /**
     * Stop editing the gantt cell.
     *
     * @param {boolean} saveEdits Should save pending changes, if any, before ending edit?
     */
    $scope.stopCellEdit = function( saveEdits ) {
        if( $scope.isEditing ) {
            $scope.isEditing = false;

            if( editorElement && editorElement[0] ) {
                editorElement[0].remove();
            }

            if( saveEdits ) {
                if( $scope.editVMP.propertyName === 'saw1Predecessors' || $scope.editVMP.propertyName === 'saw1Successors' ) {
                    var dataSource = ganttRowEditHandlerSvc.getEditHandler().getDataSource();
                    ganttRowEditHandlerSvc.saveDependencyEdits( dataSource ).then( function() {
                        ganttRowEditHandlerSvc.removeEditHandler();
                    } );
                } else {
                    ganttRowEditHandlerSvc.getEditHandler().saveEdits().then( function() {
                        ganttRowEditHandlerSvc.removeEditHandler();
                    } );
                }
            } else {
                ganttRowEditHandlerSvc.removeEditHandler();
            }

            var cellNodeEl = $( '.ganttInlineEditCell' );
            if( cellNodeEl ) {
                cellNodeEl.removeClass( 'ganttInlineEditCell' );
                cellNodeEl.children().show();
            }
        }

        $( 'body' ).off( 'mousedown touchstart', $scope._bodyClickListener );
        delete $scope._bodyClickListener;
    };

    // Start inline edit when a gantt cell is dbl clicked.
    $scope._gantCellDblClickListener = eventBus.subscribe( 'gantCellDblClicked', function( event ) {
        var taskId = ganttManager.getGanttInstance().locate( event );
        var cellNode = $( event.target ).closest( '.gantt_cell' );

        $scope.startCellEdit( taskId, cellNode );
    } );
} ] );
