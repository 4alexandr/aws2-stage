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
 * @module js/aw-parameter-view-table.directive
 */
import app from 'app';
import angular from 'angular';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/prm1ParameterViewService';
import 'js/commandPanel.service';
import 'js/appCtxService';
import 'js/visible-when.directive';
import 'js/aw-long-press.directive';
import 'js/aw-table-cell.directive';
import 'js/aw-i18n.directive';
import 'js/aw-model-icon.directive';

'use strict';

var awvs_p = 0;

var headerHeight = 54; // with border
var cellHeight = 34; // with border

// TODO controller should be in its own file
app.controller( 'awParameterViewTableCtrl',
    [ '$scope', '$element', '$filter', '$state', '$timeout', 'viewModelObjectService', 'viewModelCollectionFactory', 'selectionHelper', 'selectionService',
        'commandService', 'commandPanelService', 'appCtxService', 'prm1ParameterViewService',
        function( $scope, $element, $filter, $state, $timeout, viewModelObjectService, viewModelCollectionFactory, selectionHelper, selectionService,
            commandService, commandPanelService, appCtxService, vpeViewSvc ) {
            var eventBusSubscriptions = [];

            $scope.$on( '$destroy', function() {
                _.forEach( eventBusSubscriptions, function( sub ) {
                    eventBus.unsubscribe( sub );
                } );
            } );

            ///////////////////////////////////////////////////////////
            // Column Resize
            //
            var columnSize = {
                desc: { current: 150, minimum: 150 },
                editable: { current: 52, minimum: 36 },
                status: { current: 150, minimum: 100 },
                unit: { current: 100, minimum: 100 },
                source: { current: 100, minimum: 100 }
            };
            if( awvs_p === 2 ) {
                columnSize.editable.current = 90;
            }

            /**
             * It returns the column width
             * @param {string} col column name
             * @returns {string} column width
             */
            function getColumnSize( col ) {
                // If columnSize entry isn't present, it's assumed to be one of the MA attributes and defaulted here.
                // Note: If we wanted to have one of the MA columns have a different default it cannot just be added to
                // the table above since that would only affect the Latest MA columns.  The comparison column
                // identifiers contain a UID, so some string matching would be required here.
                columnSize[ col ] = columnSize[ col ] || { current: 102, minimum: 102 };
                return columnSize[ col ];
            }
            this.getColumnSize = getColumnSize;

            /**
             * It returns the column style
             * @param {String} col  column name
             * @returns {string} column style
             */
            $scope.getColumnWidthStyle = function( col ) {
                var widths = getColumnSize( col );
                return {
                    width: widths.current + 'px',
                    'min-width': widths.minimum + 'px'
                };
            };

            ///////////////////////////////////////////////////////////
            // Column Visibility
            //
            var columnVis = {
                checkbox: true,
                thumbnail: true,
                name: true,
                desc: true,
                editable: false,
                status: false,
                unit: true,
                source: true,
                measurement: true,
                min: true,
                att0MinOperator: false,
                goal: true,
                att0MaxOperator: false,
                max: true,
                file: false,
                revision: true
            };

            if( _.isString( $state.params.cols ) ) {
                _.forEach( _.keys( columnVis ), function( col ) {
                    columnVis[ col ] = false;
                } );
                _.forEach( $state.params.cols.split( ',' ), function( col ) {
                    columnVis[ col ] = true;
                } );
            }
            $scope.isProjectCompareLoc;
            $scope.compareType;
            //update the context with param compare type
            if( !appCtxService.ctx.paramCompareViewContext ) {
                vpeViewSvc.initParamCompareContext( appCtxService.ctx );
            }
            if( appCtxService.ctx.paramCompareViewContext && appCtxService.ctx.paramCompareViewContext.compareType === 'ProjectParamComparison' ) {
                $scope.isProjectCompareLoc = true;
                $scope.compareType = appCtxService.ctx.paramCompareViewContext.compareType;
            } else if( appCtxService.ctx.paramCompareViewContext && appCtxService.ctx.paramCompareViewContext.compareType === 'ProductParamComparison' ) {
                $scope.isProjectCompareLoc = false;
                $scope.compareType = appCtxService.ctx.paramCompareViewContext.compareType;
            }

            appCtxService.updatePartialCtx( 'paramCompareViewContext.columnVisibility', columnVis );
            $scope.columnVis = columnVis;

            eventBusSubscriptions.push( eventBus.subscribe( 'aw-parameter-view-table.updateColumnVisibility', function( data ) {
                var param = _.transform( _.pick( data.data, _.keys( columnVis ) ), function( acc, value, key ) {
                    if( value.dbValue === true || value.dbValue === 'true' ) {
                        acc.push( key );
                        columnVis[ key ] = true;
                    } else {
                        columnVis[ key ] = false;    
                    }
                }, [] );

                mainCols.css( 'flex', 'initial' );

                $state.go( '.', {
                    cols: param.join( ',' )
                }, { reload: false } );
            } ) );

            /**
             * It returns the column header sytle for comparision section
             * @param {string} uid object uid
             * @returns {string} column style
             */
            $scope.comparisonColumnHeaderStyle = function( uid ) {
                var width = 0;
                var constBorderWidth = 2;
                if( angular.equals( uid, 'Latest' ) ) {
                    if( columnVis.att0MaxOperator ) {
                        width = width + getColumnSize( 'att0MaxOperator' ).current + constBorderWidth;
                    }
                    if( columnVis.att0MinOperator ) {
                        width = width + getColumnSize( 'att0MinOperator' ).current + constBorderWidth;
                    }
                    uid = '';
                }
                if( columnVis.min ) {
                    width = width + getColumnSize( uid + 'min' ).current + constBorderWidth;
                }
                if( columnVis.goal ) {
                    width = width + getColumnSize( uid + 'goal' ).current + constBorderWidth;
                }
                if( columnVis.max ) {
                    width = width + getColumnSize( uid + 'max' ).current + constBorderWidth;
                }
                if( columnVis.file ) {
                    width = width + getColumnSize( uid + 'file' ).current + constBorderWidth;
                }
                if( columnVis.revision ) {
                    width = width + getColumnSize( uid + 'revision' ).current + constBorderWidth;
                }
                if( columnVis.measurement ) {
                    width = width + getColumnSize( uid + 'measurement' ).current + constBorderWidth;
                }
                width -= constBorderWidth;

                return {
                    width: width + 'px'
                };
            };

            /**
             * It returns the fixed syle for fixed columns
             * @returns {string} column width
             */
            $scope.getFixedColsStyle = function() {
                if( columnVis.name ) {
                    return {
                        'max-width': '80%'
                    };
                }
                var width = 0;
                if( columnVis.checkbox ) {
                    width += 26;
                }
                if( columnVis.thumbnail ) {
                    width += 30;
                }
                return {
                    'max-width': width + 'px'
                };
            };

            /**
             * method to select whole row, it handle selection event
             * @param {object} row vmo object which represent row
             * @param {object} event  event data
             */
            $scope.select = function( row, event ) {
                var dataProvider = $scope.data.dataProviders.tableDataProvider;
                var selectionModel = dataProvider.selectionModel;

                if( selectionModel ) {
                    selectionHelper.handleSelectionEvent( [ row ], selectionModel, event, dataProvider );
                    selectionModel.evaluateSelectionStatusSummary( dataProvider );
                }

                if( commandService.addDynamicCommands ) { // AW3.4 support for GWT commands
                    commandService.getCommand( 'Awp0ShowSaveAs' ).then( function( saveAsCmd ) {
                        commandService.addDynamicCommands( 'aw_toolsAndInfo', $scope.$id, [ saveAsCmd ] );
                    } );
                }
            };

            /**
             * Method to handle log press of selection
             * @param {Object} row vmo object which represent row
             * @param {Object} hammerEvent  event data
             */
            $scope.handleLongPress = function( row, hammerEvent ) {
                var event = hammerEvent.srcEvent;
                var dataProvider = $scope.data.dataProviders.tableDataProvider;
                var selectionModel = dataProvider.selectionModel;

                if( selectionModel ) {
                    if( selectionModel.getCurrentSelectedCount() ) {
                        selectionModel.setMultiSelectionEnabled( true );
                    }

                    selectionHelper.handleSelectionEvent( [ row ], selectionModel, event, dataProvider );
                    selectionModel.evaluateSelectionStatusSummary( dataProvider );
                }
            };

            ///////////////////////////////////////////////////////////
            // Sorting
            //
            $scope.sortInfo = {
                column: undefined,
                reverse: false
            };

            if( _.isString( $state.params.sort ) ) {
                var s = $state.params.sort.split( ',' );
                $scope.sortInfo.column = s[ 0 ];
                if( s.length > 1 ) {
                    $scope.sortInfo.reverse = true;
                }
            }

            /**
             * to handle row sorting in parameter table
             * @param {ObjectArray} rowArray
             * @returns {ObjectArray} sorted data rows
             */
            function applyRowSorting( rowArray ) {
                if( $scope.sortInfo.column && rowArray && rowArray.length ) {
                    var descPath = $scope.sortInfo.column.replace( /props\./, 'propertyDescriptors.' );
                    var valueType = _.get( _.find( rowArray, descPath ), descPath + '.valueType' );

                    var sortFn, sortOrder;
                    if( _.sortByOrder ) {
                        // Lodash 3.x
                        sortFn = _.sortByOrder;
                        sortOrder = $scope.sortInfo.reverse;
                    } else {
                        // Lodash 4.x
                        sortFn = _.orderBy;
                        sortOrder = $scope.sortInfo.reverse ? 'asc' : 'desc';
                    }

                    switch ( valueType ) {
                        case 3: // Double
                        case 4: // Float
                        case 5: // Integer
                        case 7: // Short
                            rowArray = sortFn( rowArray, [ function( e ) {
                                var val = _.get( e, $scope.sortInfo.column + '.value', NaN );
                                return _.isNull( val ) ? NaN : val;
                            } ], [ sortOrder ] );
                            break;

                        default:
                            var sortInfoColumn;

                            if( angular.equals( $scope.sortInfo.column, 'revVariantFormula' ) ) {
                                sortInfoColumn = $scope.sortInfo.column;
                            } else {
                                sortInfoColumn = $scope.sortInfo.column + '.uiValue';
                            }

                            rowArray = sortFn( rowArray, [ function( e ) {
                                var val = _.get( e, sortInfoColumn, null );
                                return _.isEmpty( val ) ? null : val.toUpperCase();
                            } ], [ sortOrder ] );
                    }
                }
                return rowArray;
            }

            $scope.$on( 'awParamSortableColumn', function( event ) {
                event.stopPropagation();

                // Update URL
                var param = null;
                if( $scope.sortInfo.column ) {
                    param = $scope.sortInfo.column;
                    if( $scope.sortInfo.reverse ) {
                        param += ',true';
                    }
                }
                $state.go( '.', { sort: param }, { reload: false } );

                // Re-sort
                $scope.filteredRows = applyRowSorting( $scope.filteredRows );

                // Render
                $scope.renderedRows = calculateRenderedRows();
            } );

            ///////////////////////////////////////////////////////////
            // Filters
            //
            $scope.rowFilter = [
                { value: '!!', title: $scope.i18n.ParamFilter_AllRows, class: '' },
                { value: true, title: $scope.i18n.ParamFilter_SelectedRows, class: 'prm1-filter-highlight' },
                { value: false, title: $scope.i18n.ParamFilter_UnselectedRows, class: 'prm1-filter-highlight' }
            ];
            $scope.rowFilterComp = [
                { value: '!!', title: $scope.i18n.ParamFilter_AllRows, type: 'mainConf', class: '' },
                { value: 'true', title: $scope.i18n.ParamFilter_SameValues, type: '', class: 'prm1-filter-highlight' },
                { value: 'false', title: $scope.i18n.ParamFilter_DifferentValues, type: '', class: 'prm1-filter-highlight' },
                { value: 'hasValue', title: $scope.i18n.ParamFilter_HasValue, type: 'mainConf', class: 'prm1-filter-highlight' },
                { value: 'hasNoValue', title: $scope.i18n.ParamFilter_HasNoValue, type: 'mainConf', class: 'prm1-filter-highlight' }
            ];

            $scope.filterInfo = {
                checkAll: true,
                manualRowFilter: $scope.rowFilter[ 0 ],
                text: {},
                cols: {
                    att0Value: $scope.rowFilterComp[ 0 ],
                    att0Min: $scope.rowFilterComp[ 0 ],
                    att0MinOperator: $scope.rowFilterComp[ 0 ],
                    att0Goal: $scope.rowFilterComp[ 0 ],
                    att0MaxOperator: $scope.rowFilterComp[ 0 ],
                    att0Max: $scope.rowFilterComp[ 0 ],
                    Att0HasGoalFile: $scope.rowFilterComp[ 0 ],
                    fnd0RevisionId: $scope.rowFilterComp[ 0 ]
                }
            };
            // TODO Should default the comparison cols filters here as well, but we don't know what they are
            // when this controller is initalized...  Could watch data.comparisonDefs and update when we know the uids.
            // The problem with not defaulting to one of the actual rowFilterComp array entries is that you initially
            // get a blank entry in the select dropdown which goes away once one of the real options has been selected.

            if( _.isString( $state.params.filters ) ) {
                _.forEach( $state.params.filters.split( ',' ), function( filter ) {
                    if( _.includes( [ 'name', 'desc', 'status', 'unit', 'source' ], filter.split( '-' )[ 0 ] ) ) {
                        $scope.filterInfo.text[ filter.split( '-' )[ 0 ] ] = filter.split( '-' )[ 1 ];
                    } else {
                        var filterObj = $filter( 'filter' )( $scope.rowFilterComp, { value: filter.split( '-' )[ 1 ] } );
                        $scope.filterInfo.cols[ filter.split( '-' )[ 0 ] ] = filterObj[ 0 ];
                    }
                } );
            }

            eventBusSubscriptions.push( eventBus.subscribe( 'Prm1ResetFilter', function resetFilterEvent() {
                $scope.filterInfo = {
                    checkAll: true,
                    manualRowFilter: $scope.rowFilter[ 0 ],
                    text: {},
                    cols: {
                        att0Value: $scope.rowFilterComp[ 0 ],
                        att0Min: $scope.rowFilterComp[ 0 ],
                        att0MinOperator: $scope.rowFilterComp[ 0 ],
                        att0Goal: $scope.rowFilterComp[ 0 ],
                        att0MaxOperator: $scope.rowFilterComp[ 0 ],
                        att0Max: $scope.rowFilterComp[ 0 ],
                        Att0HasGoalFile: $scope.rowFilterComp[ 0 ],
                        fnd0RevisionId: $scope.rowFilterComp[ 0 ]
                    }
                };
                _.forEach( $scope.data.comparisonDefs, function( cmp ) {
                    $scope.filterInfo.cols[ cmp.uid + '_att0Value' ] = $scope.rowFilterComp[ 0 ];
                    $scope.filterInfo.cols[ cmp.uid + '_att0Min' ] = $scope.rowFilterComp[ 0 ];
                    $scope.filterInfo.cols[ cmp.uid + '_att0Goal' ] = $scope.rowFilterComp[ 0 ];
                    $scope.filterInfo.cols[ cmp.uid + '_att0Max' ] = $scope.rowFilterComp[ 0 ];
                    $scope.filterInfo.cols[ cmp.uid + '_Att0HasGoalFile' ] = $scope.rowFilterComp[ 0 ];
                    $scope.filterInfo.cols[ cmp.uid + '_fnd0RevisionId' ] = $scope.rowFilterComp[ 0 ];
                } );
                $state.go( '.', { filters: null }, { reload: false } );
                $scope.filterTableRows();
            } ) );

            /**
             * To handle the text filters
             * @param {ObjectArray} rowArray
             */
            function applyTextFilters( rowArray ) {
                return $filter( 'filter' )( rowArray, function( row ) {
                var sourceFilter;
                if( row.props['REF(att1SourceElement,Fnd0BuildingBlockBOMLine).bl_rev_object_name'].dbValue !== null ) {
                    sourceFilter = 'props[\'REF(att1SourceElement,Fnd0BuildingBlockBOMLine).bl_rev_object_name\']';
                }else{
                    sourceFilter = 'props[\'REF(att1SourceElement,WorkspaceObject).object_name\']';
                }
                    return _.reduce( {
                    name:     'props[\'REF(att1SourceAttribute,Att0MeasurableAttribute).object_name\']',
                    desc:     'props[\'REF(att1SourceAttribute,Att0MeasurableAttribute).object_desc\']',
                    status:   'props[\'REF(att1SourceAttribute,Att0MeasurableAttribute).release_status_list\']',
                    unit:     'props[\'REF(att1SourceAttribute,Att0MeasurableAttributeDbl).att0Uom\']',
                    source:   sourceFilter
                        },
                        function( matches, prop, filter ) {
                            if( !matches ) {
                                return matches;
                            }
                            var filterVal = _.get( $scope.filterInfo.text, filter );
                            if( _.isEmpty( filterVal ) ) {
                                return true;
                            }
                            var propValue;
                            if( angular.equals( filter, 'variant' ) ) {
                                propValue = _.get( row, prop, null );
                            } else {
                                propValue = _.get( row, prop + '.uiValue', null );
                            }

                            return propValue && propValue.toLowerCase().indexOf( filterVal.toLowerCase() ) !== -1;
                        },
                        true
                    );
                } );
            }

            /**
             * to handle the attr (Measurement/Min/max/goal) value filters
             * @param {ObjectArray} rowArray
             */
            function applyAttrColumnFilters( rowArray ) {
                //Filter columns on dropdown selection
                var allFilteredRows = rowArray;

                for( var columnName in $scope.filterInfo.cols ) {
                    var filterValue = $scope.filterInfo.cols[ columnName ];

                    var attribLatestPath = getAttribLatestPath( columnName );
                    var attribCmpPath = getAttribCmpPath( columnName );

                    var filterRows = [];

                    angular.forEach( allFilteredRows, function( row ) {
                        var latestValue = _.get( row, attribLatestPath + '.value' );
                        var cmpValue = _.get( row, attribCmpPath + '.value' );

                        if( angular.equals( filterValue.value, 'hasValue' ) ) {
                            // Has value
                            if( cmpValue && cmpValue !== null && cmpValue.toString().length > 0 ) {
                                filterRows.push( row );
                            }
                        } else if( angular.equals( filterValue.value, 'hasNoValue' ) ) {
                            // Has no value
                            if( !cmpValue || cmpValue === null || cmpValue.toString().length === 0 ) {
                                filterRows.push( row );
                            }
                        } else if( angular.equals( filterValue.value, '!!' ) ) {
                            // All rows
                            filterRows.push( row );
                        } else if( angular.equals( filterValue.value, 'true' ) &&
                            angular.equals( latestValue, cmpValue ) ) {
                            // Same values
                            // To check if both values are not null
                            if( latestValue !== null && cmpValue !== null ) {
                                filterRows.push( row );
                            }
                        } else if( angular.equals( filterValue.value, 'false' ) &&
                            !angular.equals( latestValue, cmpValue ) ) {
                            // Different values
                            if( cmpValue && cmpValue !== null ) {
                                filterRows.push( row );
                            }
                        }
                    } );

                    allFilteredRows = filterRows;
                }

                return allFilteredRows;
            }

            function applyManualRowFilters( rowArray ) {
                var filteredRows = rowArray;

                if( $scope.filterInfo.manualRowFilter && $scope.filterInfo.manualRowFilter !== null ) {
                    filteredRows = $filter( 'filter' )( filteredRows, { isTableRowFileter: $scope.filterInfo.manualRowFilter.value } );
                }

                return filteredRows;
            }

            function applyAllFiltersAndSort( rowArray ) {
                // Filter
                rowArray = applyTextFilters( rowArray );
                rowArray = applyAttrColumnFilters( rowArray );
                rowArray = applyManualRowFilters( rowArray );

                // Sort
                rowArray = applyRowSorting( rowArray );

                return rowArray;
            }

            function getFilterUrlParams() {
                var params = [];
                for( var textFilterName in $scope.filterInfo.text ) {
                    var textFilterValue = $scope.filterInfo.text[ textFilterName ];
                    if( textFilterValue !== null && textFilterValue.length > 0 ) {
                        params.push( textFilterName + '-' + textFilterValue );
                    }
                }

                for( var columnFilterName in $scope.filterInfo.cols ) {
                    var columnFilter = $scope.filterInfo.cols[ columnFilterName ];
                    if( columnFilter.value !== null && !angular.equals( columnFilter.value, '!!' ) ) {
                        params.push( columnFilterName + '-' + columnFilter.value );
                    }
                }
                return params;
            }

            function updateFilterContext() {
                appCtxService.updatePartialCtx( 'paramCompareViewContext.' + 'resetFilter', getFilterContext() );
            }

            function getFilterContext() {
                if( $scope.filterInfo.manualRowFilter && $scope.filterInfo.manualRowFilter !== null && $scope.filterInfo.manualRowFilter.value !== '!!' ) {
                    return true;
                }

                for( var textFilterName in $scope.filterInfo.text ) {
                    if( _.includes( [ 'name', 'desc', 'status', 'unit', 'source' ], textFilterName ) ) {
                        var textFilterValue = $scope.filterInfo.text[ textFilterName ];
                        if( textFilterValue !== null && textFilterValue.length > 0 ) {
                            return true;
                        }
                    }
                }

                for( var columnFilterName in $scope.filterInfo.cols ) {
                    var columnFilter = $scope.filterInfo.cols[ columnFilterName ];
                    if( !angular.equals( columnFilter.value, '!!' ) ) {
                        return true;
                    }
                }
            }

            /**
             * method to filter rows in table
             */
            $scope.filterTableRows = function() {
                // Update Filter Button context
                updateFilterContext();

                // Update URL
                var params = getFilterUrlParams();
                $state.go( '.', { filters: params.join( ',' ) }, { reload: false } );

                // Apply the filters & sort
                $scope.filteredRows = applyAllFiltersAndSort( $scope.data.dataProviders.tableDataProvider.viewModelCollection.loadedVMObjects );

                // Update render
                $scope.renderedRows = calculateRenderedRows( true );
            };

            ///////////////////////////////////////////////////////////
            // Row Rendering
            //
            $scope.renderInfo = {
                numTotalRows: 0,
                numRenderedRows: 0,
                rowStartIndex: 0
            };
            $scope.renderedRows = [];
            $scope.renderAreaHeight = 0;
            $scope.visibleRowsStyle = {};

            function calculateRenderedRows( filteredRowsChanged ) {
                var filteredRows = $scope.filteredRows || [];
                if( filteredRowsChanged ) {
                    var renderHeightVal = cellHeight * filteredRows.length + 'px';
                    if( $scope.renderAreaHeight !== renderHeightVal ) {
                        $scope.renderAreaHeight = renderHeightVal;
                        $scope.tableResizerHeight = cellHeight * filteredRows.length + headerHeight + 'px';
                        $timeout( checkNeedHorizontalScrollSpace );
                    }
                    $scope.renderInfo.numRenderedRows = parseInt( ( $element.height() - headerHeight ) / cellHeight, 10 ) + 4;
                    if( $scope.renderInfo.numRenderedRows > $scope.renderInfo.numTotalRows ) {
                        $scope.renderInfo.numRenderedRows = $scope.renderInfo.numTotalRows;
                    }
                }
                if( filteredRows.length ) {
                    return filteredRows.slice( $scope.renderInfo.rowStartIndex, $scope.renderInfo.rowStartIndex + $scope.renderInfo.numRenderedRows );
                }
                return [];
            }
            this.calculateRenderedRows = calculateRenderedRows;

            var fixedCols, mainCols, varCols, scrollCols, scrollColumn;

            function checkNeedHorizontalScrollSpace() {
                fixedCols = fixedCols || $element.find( '.aw-parameter-view-table-fixed-cols' );
                mainCols = mainCols || $element.find( '.aw-parameter-view-table-main-cols' );
                varCols = varCols || $element.find( '.aw-parameter-view-table-variable-cols' );
                scrollCols = scrollCols || $element.find( '.aw-parameter-view-table-scroll-cols' );
                scrollColumn = scrollColumn || scrollCols.find( 'div[aw-parameter-view-table-scroll-column]' );

                var mainHeightDiff = mainCols[ 0 ].offsetHeight - mainCols[ 0 ].clientHeight;
                var varHeightDiff = varCols[ 0 ].offsetWidth ? varCols[ 0 ].offsetHeight - varCols[ 0 ].clientHeight : 0;

                var space = mainHeightDiff ? mainHeightDiff : varHeightDiff; // assume diff is the same if both non-zero...
                var css = {
                    'margin-bottom': space + 'px'
                };
                var cssNoSpace = {
                    'margin-bottom': '0px'
                };
                fixedCols.css( css );
                mainCols.css( mainHeightDiff ? cssNoSpace : css );
                varCols.css( varHeightDiff ? cssNoSpace : css );
                scrollCols.css( css );

                $scope.$broadcast( 'awParameterViewTable-ScrollTo', null, scrollColumn[ 0 ].scrollTop );
            }
            this.checkNeedHorizontalScrollSpace = checkNeedHorizontalScrollSpace;

            eventBusSubscriptions.push( eventBus.subscribe( 'tableDataProvider.modelObjectsUpdated', function( data ) {
                $scope.dataLoaded = true;
                if( data.viewModelObjects ) {
                    if( data.viewModelObjects.length ) {
                        if( data.firstPage && commandService.addDynamicCommands ) { // AW3.4 support for GWT commands
                            _.forEach( [ 'Awp0StartEdit' /* TODO clean this up, 'Awp0StartEditGroup', 'Awp0SaveEdits','Awp0CancelEdits'*/ ], function( cmdId ) {
                                commandService.getCommand( cmdId ).then( function( cmd ) {
                                    commandService.addDynamicCommands( 'aw_oneStep', $scope.$id, [ cmd ] );
                                } );
                            } );
                            // _.forEach(['Att1MeasurementMgmt'], function(cmdId) {
                            //     commandService.getCommand( cmdId ).then( function(cmd) {
                            //         commandService.addDynamicCommands( 'aw_toolsAndInfo', $scope.$id, [cmd] );
                            //     });
                            // });
                        }

                        $scope.data.dataProviders.tableDataProvider.attrViewModelCollection =
                        $scope.data.dataProviders.tableDataProvider.attrViewModelCollection || viewModelCollectionFactory.createViewModelCollection();
                        var attrObjects = _.map( _.filter( data.viewModelObjects, 'attribute.uid' ), 'attribute' );
                        $scope.data.dataProviders.tableDataProvider.attrViewModelCollection.updateModelObjects( attrObjects );
                    }

                    // Apply the filters & sort
                    $scope.filteredRows = applyAllFiltersAndSort( data.viewModelObjects );

                    // Update rendered rows
                    $scope.renderInfo.numTotalRows = $scope.data.dataProviders.tableDataProvider.viewModelCollection.getVirtualLength();
                    $scope.renderedRows = calculateRenderedRows( true );
                }
            } ) );

            $scope.$on( 'awParameterViewTableScroll', function( ngEvent, event ) {
                ngEvent.stopPropagation();

                // Calculate the new scroll position and broadcast change to scrollable children
                var pos = 0;
                if( event.type === 'scroll' ) {
                    pos = event.target.scrollTop;
                } else if( event.type === 'wheel' ) {
                    var top = event.currentTarget.scrollTop;
                    pos = top + event.originalEvent.deltaY;
                    var max = event.currentTarget.scrollHeight - event.currentTarget.clientHeight;
                    if( pos > max ) {
                        pos = max;
                    }
                }
                $scope.$broadcast( 'awParameterViewTable-ScrollTo', event, pos );

                // Adjust rendered rows for new position
                var rowIdx = parseInt( pos / cellHeight, 10 );
                var newStartIdx;
                var rowPos;
                if( rowIdx < 4 ) {
                    rowPos = 0;
                    newStartIdx = 0;
                } else if( $scope.renderInfo.numTotalRows - $scope.renderInfo.numRenderedRows < rowIdx ) {
                    newStartIdx = $scope.renderInfo.numTotalRows - $scope.renderInfo.numRenderedRows;
                    rowPos = newStartIdx * cellHeight;
                } else {
                    newStartIdx = rowIdx - 2;
                    rowPos = newStartIdx * cellHeight;
                }
                $scope.$apply( function() {
                    if( $scope.renderInfo.rowStartIndex !== newStartIdx ) {
                        $scope.renderInfo.rowStartIndex = newStartIdx;
                        $scope.renderedRows = calculateRenderedRows();
                    }
                    $scope.visibleRowsStyle.top = rowPos + 'px';
                } );
            } );

            /**
             * It enabled the column visibility
             * @param {object} row VMO which represents rows in table
             */
            $scope.toggleCheckboxSelection = function( row ) {
                row.isTableRowFileter = !row.isTableRowFileter;
            };

            /**
             * to handle the first row column filter, depend on checkbox selected
             */
            $scope.checkBoxAllChanged = function() {
                if( $scope.filterInfo.checkAll ) {
                    if( $scope.filteredRows.length !== $scope.data.dataProviders.tableDataProvider.viewModelCollection.loadedVMObjects.length ) {
                        _.each( $scope.data.dataProviders.tableDataProvider.viewModelCollection.loadedVMObjects, function( row ) { row.isTableRowFileter = false; } );
                        _.each( $scope.filteredRows, function( row ) { row.isTableRowFileter = true; } );
                    } else {
                        _.each( $scope.data.dataProviders.tableDataProvider.viewModelCollection.loadedVMObjects, function( row ) { row.isTableRowFileter = true; } );
                    }
                } else {
                    if( $scope.filteredRows.length !== $scope.data.dataProviders.tableDataProvider.viewModelCollection.loadedVMObjects.length ) {
                        _.each( $scope.data.dataProviders.tableDataProvider.viewModelCollection.loadedVMObjects, function( row ) { row.isTableRowFileter = true; } );
                        _.each( $scope.filteredRows, function( row ) { row.isTableRowFileter = false; } );
                    } else {
                        _.each( $scope.data.dataProviders.tableDataProvider.viewModelCollection.loadedVMObjects, function( row ) { row.isTableRowFileter = false; } );
                    }
                }
            };

            /**
             * to launch the column config panel
             */
            $scope.showHideColumnsCmdPanel = function() {
                commandPanelService.activateCommandPanel( 'prm1ColumnConfiguration', 'aw_toolsAndInfo' );
            };

            /**
             * to remove object from comparison
             * @param {object} cmp vmo
             */
            $scope.removeComparison = function( cmp ) {
                $scope.$emit( 'awParameterViewTable-removeCmp', { uid: cmp.vmo.uid } );
            };

            ///////////////////////////////////////////////////////////
            // Abuse the data provider a bit to include the attribute objects in the ones that can be edited.
            //
            $scope.data.dataProviders.tableDataProvider.getEditableObjects = function() {
                return _.flatten( [
                    this.viewModelCollection.getLoadedViewModelObjects(),
                    this.attrViewModelCollection ? this.attrViewModelCollection.getLoadedViewModelObjects() : []
                ] );
            };
            $scope.data.dataProviders.tableDataProvider.getPropertyNames = function() {
            return [ 'REF(att1SourceAttribute,Att0MeasurableAttribute).object_desc','REF(att1SourceAttribute,Att0MeasurableAttributeDbl).REF(att0CurrentValue,Att0MeasureValueDbl).att0Value', 'REF(att1SourceAttribute,Att0MeasurableAttributeDbl).att0Goal', 'REF(att1SourceAttribute,Att0MeasurableAttributeDbl).att0Min', 'REF(att1SourceAttribute,Att0MeasurableAttributeDbl).att0Max' ];
            };

        // start of integrated view ctr code - not allow to write a custom location controller, so moved the ctr code to directive js
        // would be better if this wasn't duplicating knowledge of what params are important
        // also, first one is important -- indicates the param with the comparison UIDs
        var paramMap = {
            prm1RevisionRuleCompare: [ 'rv_uids', 'vrs_uids', 'cols', 'sel_uids' ],
            ProjectParamComparison:[ 'rv_uids', 'cols', 'sel_uids' ],
            ProductParamComparison:[ 'vrs_uids', 'rcp_uids', 'cols', 'sel_uids' ]
            };

            $scope.$on( '$locationChangeSuccess', function() {
                // If URL edited and no UID, force hard reload
                if( !$state.params.uid ) {
                    $state.go( '.', {}, { reload: true } );
                }
            } );

            $scope.$on( 'awParameterViewTable-removeCmp', function( event, data ) {
            var cmpParam = '';
            if( $state.params.rcp_uids !== null ) {
                cmpParam = paramMap[$scope.compareType][1];
            }else{
                cmpParam = paramMap[$scope.compareType][0];
            }
                //temp added, need to change separator in project comparison
                var separator;
                if( $scope.isProjectCompareLoc === true ) {
                    separator = ',';
                } else {
                    separator = '#';
                }
                var uids = typeof $state.params[ cmpParam ] === 'string' ? $state.params[ cmpParam ].split( separator ) : [];
                var updatedParams = {};
                updatedParams[ cmpParam ] = _.filter( uids, function( u ) {
                    return u !== data.uid;
                } ).join( separator );
                $state.go( '.', updatedParams );
                eventBus.publish( 'prm1RevisionRuleCompareTable.reset', {} );
            } );

            $scope.$on( 'awParameterViewTable-reorderCmp', function( event, uids ) {
            var cmpParam = '';
            if( $state.params.rcp_uids !== null ) {
                cmpParam = paramMap[$scope.compareType][1];
            }else{
                cmpParam = paramMap[$scope.compareType][0];
            }
                var separator;
                if( $scope.isProjectCompareLoc === true ) {
                    separator = ',';
                } else {
                    separator = '#';
                }
                var updatedParams = {};
                updatedParams[ cmpParam ] = uids.join( separator );
                $state.go( '.', updatedParams, { reload: false } );
            } );

            appCtxService.updatePartialCtx( 'paramCompareViewContext.previousView', $state.current.name );

            var toState = $state.params;
        var cmpParam = '';
        if( toState.rcp_uids !== null ) {
            cmpParam = paramMap[$scope.compareType][1];
        }else{
            cmpParam = paramMap[$scope.compareType][0];
        }
            var savedParams = appCtxService.getCtx( 'paramCompareViewContext' )[ toState.name ];
            if( !$state.params[ cmpParam ] && savedParams && savedParams.uid === $state.params.uid ) {
                $state.go( '.', _.merge( _.clone( $state.params ), savedParams ) );
            } else {
                appCtxService.updatePartialCtx(
                    'paramCompareViewContext.' + toState.name,
                    _.pick( $state.params, _.flatten( [ 'uid', paramMap[ toState.name ] ], [ 'sel_uids', paramMap[ toState.name ] ] ) )
                );
            }
            //End of integrated view ctr code
        }
    ] );

function getAttribLatestPath( columnName ) {
    if( _.includes( columnName, 'att0Value' ) ) {
        return 'props[\'REF(att1SourceAttribute,Att0MeasurableAttributeDbl).REF(att0CurrentValue,Att0MeasureValueDbl).att0Value\']';
    } else if( _.includes( columnName, 'att0Min' ) ) {
        return 'props[\'REF(att1SourceAttribute,Att0MeasurableAttributeDbl).att0Min\']';
    } else if( _.includes( columnName, 'att0Goal' ) ) {
        return 'props[\'REF(att1SourceAttribute,Att0MeasurableAttributeDbl).att0Goal\']';
    } else if( _.includes( columnName, 'att0Max' ) ) {
        return 'props[\'REF(att1SourceAttribute,Att0MeasurableAttributeDbl).att0Max\']';
    } else if( _.includes( columnName, 'Att0HasGoalFile' ) ) {
        return 'props[\'REF(att1SourceAttribute,Att0MeasurableAttribute).GRMREL(Att0HasGoalFile,Dataset).secondary_object\']';
    } else if( _.includes( columnName, 'fnd0RevisionId' ) ) {
        return 'props[\'REF(att1SourceAttribute,Att0MeasurableAttribute).fnd0RevisionId\']';
    }
}

function getAttribCmpPath( columnName ) {
    if( _.includes( columnName, '_' ) ) {
        var uid = columnName.substring( 0, columnName.lastIndexOf( '_' ) );
        var col = columnName.substring( columnName.lastIndexOf( '_' ) + 1, columnName.length );
        return 'comparisons[' + uid + '].' +  getAttribLatestPath( col );
    }
    return getAttribLatestPath( columnName );
}

app.directive( 'awParameterViewTable',
    [ '$window',
        function( $window ) {
            return {
                restrict: 'E',
                scope: true, // TODO isolated scope?
                // TODO should bind to table data, not assume what is in scope
                controller: 'awParameterViewTableCtrl',
                templateUrl: app.getBaseUrlPath() + '/html/aw-parameter-view-table.directive.html',
                link: function( scope, element, attrs, ctrl ) {
                    var handleResize = function() {
                        var numRowsToRender = parseInt( ( element.height() - headerHeight ) / cellHeight, 10 ) + 4; // TODO this is duplicated
                        if( scope.renderInfo.numRenderedRows !== numRowsToRender ) {
                            scope.$apply( function() {
                                scope.renderInfo.numRenderedRows = numRowsToRender;
                                scope.renderedRows = ctrl.calculateRenderedRows();
                            } );
                        }
                        ctrl.checkNeedHorizontalScrollSpace();
                    };

                    angular.element( $window ).on( 'resize', handleResize );

                    scope.$on( '$destroy', function() {
                        angular.element( $window ).off( 'resize', handleResize );
                    } );
                }

            };
        }
    ] );

// TODO these directives should be in their own files...
app.directive( 'awParameterViewTableScrollColumn', [ function() {
    return {
        restrict: 'A',
        require: '^awParameterViewTable',
        link: function postLink( scope, element, attrs ) {
            // Only want to listen to scroll events for the column that has the scrollbar visible.
            // Otherwise, we end up bouncing events back and forth when scrollTop is changed on
            // the other columns.
            var domEvents = attrs.awParameterViewTableScrollColumn === 'both' ? 'scroll wheel' : 'wheel';

            element.on( domEvents, function( event ) {
                // Let table controller know we're changing scroll position
                scope.$emit( 'awParameterViewTableScroll', event );
            } );

            scope.$on( 'awParameterViewTable-ScrollTo', function( event, source, position ) {
                // Only set scrollTop when this element isn't the original source
                // of the position change.  Otherwise, we'll interrupt the normal
                // series of scroll events that are generated and end up with moving
                // only 1px at a time.
                if( !source || source.target !== element[ 0 ] ) {
                    element.scrollTop( position );
                }
            } );
        }
    };
} ] );

app.directive( 'awParamColumnResizer', [ '$document', function( $document ) {
    return {
        restrict: 'E',
        require: '^awParameterViewTable',
        link: function postLink( $scope, $el, $attrs, tableCtrl ) {
            var sizedEl = $el.parent();

            var onDown = function( event ) {
                event.preventDefault();
                if( event.type === 'mousedown' ) {
                    $document.on( 'mousemove', onMove );
                    $document.on( 'mouseup', onUp );
                } else if( event.type === 'touchstart' ) {
                    $document.on( 'touchmove', onMove );
                    $document.on( 'touchend', onUp );
                }
            };

            var onMove = function( event ) {
                var width = event.pageX - sizedEl.offset().left;
                var colSize = tableCtrl.getColumnSize( $attrs.columnName );
                if( !colSize.minimum || width >= colSize.minimum ) {
                    $scope.$apply( function() {
                        colSize.current = width;
                    } );
                    tableCtrl.checkNeedHorizontalScrollSpace();
                }
                //$document.find('.aw-parameter-view-table-main-cols').css("flex","initial");
            };

            var onUp = function() {
                $document.off( 'mousemove', onMove );
                $document.off( 'mouseup', onUp );
                $document.off( 'touchmove', onMove );
                $document.off( 'touchend', onUp );
            };

            $el.on( 'touchstart', onDown );
            $el.on( 'mousedown', onDown );
        }
    };
} ] );

app.directive( 'awParameterViewTableResizer', [ '$document', function( $document ) {
    return {
        restrict: 'E',
        require: '^awParameterViewTable',
        template: '<div class="aw-parameter-view-table-resizer-grabber"></div>',
        link: function postLink( $scope, $el, $attrs, tableCtrl ) {
            var sizedEl = $el.prev();
            var grabberEl = $el.children( '.aw-parameter-view-table-resizer-grabber' );
            var fixedRows = $attrs.fixedRows ? $scope.$eval( $attrs.fixedRows ) : false;

            var onDown = function( event ) {
                event.preventDefault();
                if( event.type === 'mousedown' ) {
                    $document.on( 'mousemove', onMove );
                    $document.on( 'mouseup', onUp );
                } else if( event.type === 'touchstart' ) {
                    $document.on( 'touchmove', onMove );
                    $document.on( 'touchend', onUp );
                }
            };

            var onMove = function( event ) {
                var width = event.pageX - sizedEl.offset().left;
                if( fixedRows ) {
                    // let the user make it as wide as they want up to max-width, enforced by browser
                } else if( width > sizedEl[ 0 ].scrollWidth ) {
                    width = sizedEl[ 0 ].scrollWidth;
                }
                sizedEl.css( 'flex', '0 0 ' + width + 'px' );
                tableCtrl.checkNeedHorizontalScrollSpace();
            };

            var onUp = function() {
                $document.off( 'mousemove', onMove );
                $document.off( 'mouseup', onUp );
                $document.off( 'touchmove', onMove );
                $document.off( 'touchend', onUp );
            };

            grabberEl.on( 'touchstart', onDown );
            grabberEl.on( 'mousedown', onDown );

            $scope.$on( '$destroy', function() {
                sizedEl.css( 'flex', 'initial' );
            } );
        }
    };
} ] );

app.directive( 'awParamMovableBoundry', [ function() {
    return {
        restrict: 'A',
        controller: [ '$scope', '$element', function awParamMovableBoundryCtrl( $scope, $el ) {
            var ctrl = this;

            ctrl.getBoundry = function getBoundry() {
                var boundry = $el.offset();
                return {
                    left: boundry.left,
                    right: boundry.left + $el.outerWidth()
                };
            };

            ctrl.getCmpMovableCenterPoints = function getCmpMovableCenterPoints() {
                var cols = $el.find( '[aw-param-movable="true"]' );
                return _.map( cols, function( ce ) {
                    var c = angular.element( ce );
                    return {
                        element: ce,
                        center: c.offset().left + c.outerWidth() / 2
                    };
                } );
            };

            ctrl.checkScroll = function checkScroll( mouseX ) {
                var boundry = ctrl.getBoundry();
                var curScroll = $el.scrollLeft();
                if( curScroll > 0 && mouseX < boundry.left + 40 ) {
                    $el.scrollLeft( curScroll - 20 );
                } else if( mouseX > boundry.right - 40 ) {
                    $el.scrollLeft( curScroll + 20 );
                }
            };
        } ]
    };
} ] );
app.directive( 'awParamMovable', [ '$document', function( $document ) {
    return {
        restrict: 'A',
        require: '^^awParamMovableBoundry',
        link: function postLink( $scope, $el, $attrs, boundryCtrl ) {
            var clonedEl = null;
            var movedColEl = null;
            var mouseOffset = 0;
            var boundryCheckLimit = 0;

            var onDown = function( event ) {
                event.preventDefault();
                if( event.type === 'mousedown' ) {
                    $document.on( 'mousemove', onMove );
                    $document.on( 'mouseup', onUp );
                } else if( event.type === 'touchstart' ) {
                    $document.on( 'touchmove', onMove );
                    $document.on( 'touchend', onUp );
                }
            };

            var onMove = function( event ) {
                // TODO need to figure out this magic 43 value
                // Seems to be something with most of the jQuery API values being
                // relative to something different than where the css left property
                // is working off of.
                var boundry = boundryCtrl.getBoundry();
                if( clonedEl === null ) {
                    movedColEl = $el[ 0 ];
                    mouseOffset = event.pageX - $el.offset().left;
                    clonedEl = $el.clone();
                    clonedEl.css( {
                        position: 'absolute',
                        top: 0,
                        left: $el.offset().left - 43 + 'px'
                    } );
                    clonedEl.addClass( 'aw-param-movable-moving' );
                    $el.parent().append( clonedEl );
                    boundryCheckLimit = clonedEl.outerWidth() / 3;
                } else {
                    var left = event.clientX - mouseOffset;
                    var right = left + clonedEl.outerWidth();
                    // Adjustments below to give it a little movement out of
                    // the boundry, to give more room for droping at the very
                    // beginning and end.
                    var absoluteLeft = boundry.left - boundryCheckLimit;
                    if( left < absoluteLeft ) {
                        left = absoluteLeft;
                    }
                    var absoluteRight = boundry.right + boundryCheckLimit;
                    if( right > absoluteRight ) {
                        left = absoluteRight - clonedEl.outerWidth();
                    }
                    clonedEl.css( 'left', left - 43 );

                    // Trigger horizontal scroll if near sides of boundry
                    // TODO not as smooth as it could be since this only triggers on mouse movement.
                    boundryCtrl.checkScroll( event.clientX );
                }
            };

            var onUp = function( event ) {
                if( clonedEl !== null ) {
                    clonedEl.remove();
                    clonedEl = null;
                }

                $document.off( 'mousemove', onMove );
                $document.off( 'mouseup', onUp );
                $document.off( 'touchmove', onMove );
                $document.off( 'touchend', onUp );

                var curIndex = -1;
                var newIndex = 0;
                var colCenters = boundryCtrl.getCmpMovableCenterPoints();
                for( var i = 0; i < colCenters.length; ++i ) {
                    if( movedColEl === colCenters[ i ].element ) {
                        curIndex = i;
                    }
                    if( event.pageX > colCenters[ i ].center ) {
                        newIndex = i + ( curIndex === -1 ? 1 : 0 );
                    }
                }

                movedColEl = null;

                if( curIndex >= 0 && curIndex !== newIndex ) {
                    $scope.$apply( function() {
                        var def = $scope.data.comparisonDefs.splice( curIndex, 1 )[ 0 ];
                        $scope.data.comparisonDefs.splice( newIndex, 0, def );
                        $scope.$emit( 'awParameterViewTable-reorderCmp', _.map( $scope.data.comparisonDefs, 'vmo.uid' ) );
                    } );
                }
            };

            $el.on( 'touchstart', onDown );
            $el.on( 'mousedown', onDown );
        }
    };
} ] );

app.directive( 'awParamSortableColumn', [ '$compile', function( $compile ) {
    return {
        restrict: 'A',
        link: function postLink( scope, element, attrs ) {
            element.bind( 'click', function() {
                scope.$apply( function() {
                    var columnPath = scope.$eval( attrs.awParamSortableColumn );
                    if( scope.sortInfo.column === columnPath ) {
                        scope.sortInfo.reverse = !scope.sortInfo.reverse;
                    } else {
                        scope.sortInfo.column = columnPath;
                    }
                    scope.$emit( 'awParamSortableColumn' );
                } );
            } );

            element.append( $compile( '<span ng-show="sortInfo.column === ' + attrs.awParamSortableColumn + '" ng-class="{\'prm1-sort-arrow-down\': !sortInfo.reverse, \'prm1-sort-arrow-up\': sortInfo.reverse}"></span>' )( scope ) );
        }
    };
} ] );

app.directive( 'awParamTableCell', [ function() {
    return {
        restrict: 'E',
        scope: {
            prop: '=',
            modifiable: '@?'
        },
        template: '<aw-table-cell class="aw-jswidgets-tablecell" prop="prop" modifiable="{{modifiable}}"></aw-table-cell>'
    };
} ] );
