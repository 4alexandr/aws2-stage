// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Directive to display navigation breadcrumb.
 *
 * @module js/aw-float-graph-popup-breadcrumb.directive
 */
import * as app from 'app';
import ngModule from 'angular';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import browserUtils from 'js/browserUtils';
import 'js/aw-command-bar.directive';
import 'js/exist-when.directive';
import 'js/aw-popup-panel.directive';
import 'js/aw-property-image.directive';
import 'js/aw-repeat.directive';
import 'js/viewModelService';
import 'js/appCtxService';
import 'js/locationNavigation.service';
import 'js/aw.navigateBreadCrumbService';
import 'js/panelContentService';
import 'js/localeService';
import 'js/aw.navigateBreadCrumbService';
import 'js/adapterService';

'use strict';

/**
 * Directive to display the navigation bread crumb
 *
 * @example <aw-float-graph-popup-breadcrumb></aw-float-graph-popup-breadcrumb>
 * @member aw-float-graph-popup-breadcrumb
 * @memberof NgElementDirectives
 */
app.directive( 'awFloatGraphPopupBreadcrumb', [ 'localeService', function( localeSvc ) {
    return {
        restrict: 'E',
        scope: {
            provider: '=',
            breadcrumbConfig: '='
        },
        link: function( scope ) {
            localeSvc.getTextPromise().then( function( localTextBundle ) {
                scope.loadingMsg = localTextBundle.LOADING_TEXT;
            } );
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-float-graph-popup-breadcrumb.directive.html',
        controller: [ //
            '$scope', //
            '$element', //
            '$state', //
            '$timeout', //
            'aw.navigateBreadCrumbService', //
            'viewModelService', //
            'appCtxService', //
            'panelContentService',
            'adapterService',
            function( $scope, $element, $state, $timeout, navigateBreadCrumbService, viewModelSvc,
                appCtxService, panelContentService, adapterSvc ) {
                var self = this;

                /**
                 * {ObjectArray} Collection of eventBus subscription definitions to be un-subscribed from when
                 * this controller's $scope is later destroyed.
                 */
                var _eventBusSubDefs = [];

                /**
                 * Function bound/unbound to/from window 'resize' events.
                 */
                self.resizeHandler = function() {
                    $scope.checkBreadcrumbOverflow();
                };

                if( !$scope.breadcrumbConfig.id ) {
                    $scope.breadcrumbConfig.id = 'wabc';
                }

                // default position for showing overflow icon
                if( $scope.breadcrumbConfig && !$scope.breadcrumbConfig.overflowIndex ) {
                    $scope.breadcrumbConfig.overflowIndex = 1;
                }

                var popuplist = '/html/defaultbreadcrumblist.html';

                if( $scope.breadcrumbConfig && $scope.breadcrumbConfig.popuplist ) {
                    popuplist = $scope.breadcrumbConfig.popuplist;
                }
                $scope.popuplist = app.getBaseUrlPath() + popuplist;

                $scope.isIE = browserUtils.isIE;

                var breadcrumbValueUpdated = function( mo, element ) {
                    adapterSvc
                        .getAdaptedObjects( [ mo ] )
                        .then(
                            function( adaptedObj ) {
                                if( element.displayName !== adaptedObj[ 0 ].props[ $scope.breadcrumbConfig.displayProperty ].uiValues[ 0 ] ) {
                                    element.displayName = adaptedObj[ 0 ].props[ $scope.breadcrumbConfig.displayProperty ].uiValues[ 0 ];
                                    return true;
                                }
                                return false;
                            } );
                };

                var checkForBreadcrumbDisplayNameChange = function( data ) {
                    if( data.modifiedObjects && data.modifiedObjects.length > 0 ) {
                        var valueUpdated = false;
                        data.modifiedObjects.forEach( function( mo ) {
                            if( !valueUpdated ) {
                                $scope.$evalAsync( function() {
                                    $scope.provider.crumbs.forEach( function( element ) {
                                        if( !valueUpdated && mo.props[ $scope.breadcrumbConfig.displayProperty ] &&
                                            element.scopedUid && element.scopedUid === mo.uid ) {
                                            valueUpdated = breadcrumbValueUpdated( mo, element );
                                        }
                                    } );
                                } );
                            }
                        } );
                    }
                };

                if( $scope.breadcrumbConfig && $scope.breadcrumbConfig.displayProperty ) {
                    //Add listener to check the change of object's property value ( which is shown in breadcrumb )
                    _eventBusSubDefs.push( eventBus.subscribe( 'cdm.modified', function( data ) {
                        checkForBreadcrumbDisplayNameChange( data );
                    } ) );
                }

                if( $scope.breadcrumbConfig && !$scope.breadcrumbConfig.noUpdate ) {
                    _eventBusSubDefs.push( eventBus.subscribe( 'navigateBreadcrumb.refresh', function( bcId ) {
                        if( !bcId && $scope.breadcrumbConfig && $scope.breadcrumbConfig.id ) {
                            bcId = $scope.breadcrumbConfig.id;
                        }
                        if( bcId ) {
                            var promise = navigateBreadCrumbService.readUrlForCrumbs( bcId, true );
                            promise.then( function( breadCrumbMap ) {
                                $scope.$evalAsync( function() {
                                    var crumbsList = [];
                                    $.each( breadCrumbMap, function( key, val ) {
                                        if( val && val.props.object_string &&
                                            val.props.object_string.uiValues[ 0 ] ) {
                                            var crumb = navigateBreadCrumbService.generateCrumb(
                                                val.props.object_string.uiValues[ 0 ], true, false, key );
                                            crumbsList.push( crumb );
                                        } else {
                                            logger.error( 'Cannot find object_string in modelObject' );
                                        }
                                    } );

                                    if( crumbsList.length > 0 ) {
                                        crumbsList[ crumbsList.length - 1 ].showArrow = false;
                                        crumbsList[ crumbsList.length - 1 ].selectedCrumb = true;
                                    }

                                    if( $scope.provider ) {
                                        $scope.provider.crumbs = crumbsList;
                                    }
                                } );
                            } );
                        }
                    } ) );
                }

                //use the .breadcrumbConfig.vm to pass value into the aw-include
                if( $scope.breadcrumbConfig && $scope.breadcrumbConfig.vm ) {
                    panelContentService
                        .getViewModelById( $scope.breadcrumbConfig.vm )
                        .then(
                            function( declViewModel ) {
                                viewModelSvc
                                    .populateViewModelPropertiesFromJson( declViewModel.viewModel )
                                    .then(
                                        function( customPanelViewModel ) {
                                            viewModelSvc.setupLifeCycle( $scope, customPanelViewModel );

                                            $scope.data = customPanelViewModel;
                                            //setting the cheron data provider
                                            $scope
                                                .$evalAsync( function() {
                                                    $scope.chevronDataProvider = $scope.data.dataProviders[ $scope.breadcrumbConfig.chevronDataProvider ];
                                                } );
                                        },
                                        function() {
                                            logger
                                                .error( 'Failed to resolve declarative view model for navigation bread crumb' );
                                        } );
                            } );
                }

                _eventBusSubDefs.push( eventBus.subscribe( $scope.breadcrumbConfig.id +
                    'settingChevronPopupPosition',
                    function() {
                        $scope.data.showPopup = true;
                    } ) );

                var toggleCrumbPopUp = function( selectedCrumb ) {
                    $scope.currentCrumb = selectedCrumb;

                    if( selectedCrumb.clicked === false ) {
                        appCtxService.unRegisterCtx( $scope.breadcrumbConfig.id + 'Chevron' );
                    } else if( selectedCrumb.clicked === true ) {
                        appCtxService.registerCtx( $scope.breadcrumbConfig.id + 'Chevron', selectedCrumb );
                        eventBus.publish( $scope.breadcrumbConfig.id + '.chevronClicked', selectedCrumb );
                    }
                };

                // When a link in bread crumb is clicked
                $scope.setScopedCrumb = function( selectedCrumb ) {
                    // close the pop-up if opened
                    $scope.provider.crumbs.forEach( function( element ) {
                        element.clicked = false;
                    } );

                    toggleCrumbPopUp( selectedCrumb );

                    if( !$scope.breadcrumbConfig.noUpdate && !$scope.provider.onSelect ) {
                        var newCrumbs = [];

                        for( var i = 0; i < $scope.provider.crumbs.length; i++ ) {
                            var element = $scope.provider.crumbs;

                            if( element[ i ].scopedUid ) {
                                if( element[ i ].scopedUid === selectedCrumb.scopedUid ) {
                                    newCrumbs.push( element[ i ].scopedUid );
                                    break;
                                } else {
                                    newCrumbs.push( element[ i ].scopedUid );
                                }
                            }
                        }

                        $state.params[ $scope.breadcrumbConfig.id ] = newCrumbs.join( '^' );
                        $state.go( '.', $state.params );

                        appCtxService.registerCtx( $scope.breadcrumbConfig.id + 'Link', selectedCrumb );
                    }

                    // building url
                    if( $scope.provider.onSelect ) {
                        $scope.provider.onSelect( selectedCrumb );
                    }
                };

                $scope.$on( '$destroy', function() {
                    $( window ).off( 'resize', self.resizeHandler );

                    _.forEach( _eventBusSubDefs, function( subDef ) {
                        eventBus.unsubscribe( subDef );
                    } );

                    eventBus.publish( $scope.breadcrumbConfig.id + '.destroy' );
                    appCtxService.unRegisterCtx( $scope.breadcrumbConfig.id + 'Chevron' );
                    appCtxService.unRegisterCtx( $scope.breadcrumbConfig.id + 'Link' );

                    $scope.breadcrumbConfig.id = null;
                    $scope.breadcrumbConfig = null;

                    $( 'body' ).off( 'click', $scope.hideChevronPopUp );
                } );

                $scope.hideChevronPopUp = function( event ) {
                    event.stopPropagation();
                    var parent = event.target;

                    // check for scrolling the content of popup - TODO: rewrite this logic
                    if( parent && parent.className !== 'ng-scope aw-base-scrollPanel' ) {
                        while( parent &&
                            parent.className !== 'aw-layout-popup aw-layout-popupOverlay afx-content-background' &&
                            parent.className !== 'aw-jswidget-controlArrow aw-jswidget-controlArrowRotateRight' &&
                            parent.className !== 'ng-scope aw-base-scrollPanel' ) {
                            parent = parent.parentNode;
                        }

                        // clicked outside the body
                        if( !parent ) {
                            // reset crumbs
                            $scope.provider.crumbs.forEach( function( element ) {
                                element.clicked = false;
                            } );

                            // hide chevron popup
                            $scope.data.showPopup = false;
                            appCtxService.unRegisterCtx( $scope.breadcrumbConfig.id + 'Chevron' );
                        }
                        // another chevron is clicked to show popup OR something is selected inside chevron popup
                        else if( parent && parent.className === 'ng-scope aw-base-scrollPanel' ) {
                            // reset crumbs
                            $scope.provider.crumbs.forEach( function( element ) {
                                element.clicked = false;
                            } );
                            eventBus.publish( 'awPopupWidget.close', {} );
                        }
                    }
                };

                /**
                 * Called when a change is made in window size or the collection of crumbs. It sets which crumbs
                 * are to be consider in the 'overflow' chevron.
                 */
                $scope.checkBreadcrumbOverflow = function() {
                    // overflow icon shown at the start of crumb i.e first position
                    if( $scope.breadcrumbConfig && $scope.breadcrumbConfig.overflowIndex === 0 ) {
                        $scope.overflowAtStart = true;
                    }

                    var bcWidth = 0;
                    var crumbCount = 0;
                    var doubleLeftIconWidth = 24; // default width of overflow icon

                    $element.find( 'div.aw-layout-eachCrumb.ng-scope' ).each( function() {
                        if( !$scope.provider.crumbs[ crumbCount ].width || $( this ).width() > 0 ) {
                            $scope.provider.crumbs[ crumbCount ].width = $( this ).width();
                        }
                        crumbCount++;
                    } );

                    $scope.provider.crumbs.forEach( function( element ) {
                        bcWidth += element.width;
                    } );

                    var workareaWidth = $element.parent().width();
                    if( workareaWidth < bcWidth ) {
                        //if the overflow icon position is zero(i.e. at the start of crumbs) then overflow icon will take extra width.
                        if( $scope.breadcrumbConfig && $scope.breadcrumbConfig.overflowIndex === 0 ) {
                            workareaWidth -= doubleLeftIconWidth;
                        }

                        var crumbPopList = [];

                        if( $scope.breadcrumbConfig && $scope.breadcrumbConfig.overflowIndex ) {
                            for( var i = 0; i < $scope.provider.crumbs.length; i++ ) {
                                if( i === $scope.breadcrumbConfig.overflowIndex - 1 ) {
                                    $scope.provider.crumbs[ i ].overflowIconPosition = true;
                                } else {
                                    $scope.provider.crumbs[ i ].overflowIconPosition = false;
                                }
                            }

                            // recalculating the available width & breadcrumbWidth if overflow index is not at the start of breadcrumb
                            for( var i = 0; i < $scope.breadcrumbConfig.overflowIndex; i++ ) {
                                workareaWidth -= $scope.provider.crumbs[ i ].width;
                                bcWidth -= $scope.provider.crumbs[ i ].width;
                            }

                            for( var i = $scope.breadcrumbConfig.overflowIndex; i < $scope.provider.crumbs.length; i++ ) {
                                if( bcWidth > workareaWidth ) {
                                    bcWidth -= $scope.provider.crumbs[ i ].width;
                                    crumbPopList.push( $scope.provider.crumbs[ i ] );
                                    $scope.provider.crumbs[ i ].willOverflow = true;
                                } else {
                                    $scope.provider.crumbs[ i ].willOverflow = false;
                                }
                            }
                        }

                        $scope.provider.overflowCrumbList = crumbPopList;

                        if( $scope.provider.overflowCrumbList.length ) {
                            $scope.showOverflowAtStart = true;
                        }
                    } else if( $scope.breadcrumbConfig && $scope.breadcrumbConfig.overflowIndex ) {
                        // no overflow : form linear crumbs
                        $scope.showOverflowAtStart = false;

                        if( !_.isEmpty( $scope.provider.crumbs ) ) {
                            if( !_.isEmpty( $scope.provider.overflowCrumbList ) ) {
                                for( var i = 0; i < $scope.provider.overflowCrumbList.length; i++ ) {
                                    var crumbNdx = i + $scope.breadcrumbConfig.overflowIndex;

                                    if( $scope.provider.crumbs[ crumbNdx ] ) {
                                        $scope.provider.crumbs[ crumbNdx ].willOverflow = false;
                                    }
                                }

                                $scope.provider.overflowCrumbList = [];
                            }

                            // overflow index is not at the start of crumbs
                            if( $scope.breadcrumbConfig.overflowIndex &&
                                $scope.provider.crumbs.length >= $scope.breadcrumbConfig.overflowIndex ) {
                                $scope.provider.crumbs[ $scope.breadcrumbConfig.overflowIndex - 1 ].overflowIconPosition = false;
                            }
                        }
                    }
                };

                $( window ).on( 'resize', self.resizeHandler );

                _eventBusSubDefs.push( eventBus.subscribe( 'awFloatGraphPopup.resizeBreadcrumb', self.resizeHandler ) );

                $scope.onOverflowChevronClick = function( event ) {
                    $scope.$evalAsync( function() {
                        var currElement = ngModule.element( event.currentTarget.parentElement );
                        currElement.scope().$broadcast( 'awPopupWidget.open', {
                            popupUpLevelElement: ngModule.element( event.currentTarget.parentElement )
                        } );
                    } );
                };

                $scope.$watch( 'data.showPopup', function _watchShowPopup( newValue, oldValue ) {
                    if( !( _.isNull( newValue ) || _.isUndefined( newValue ) ) && newValue !== oldValue ) {
                        if( newValue === true ) {
                            $timeout( function() {
                                $( 'body' ).on( 'click', $scope.hideChevronPopUp );
                            }, 200 );
                        } else {
                            $scope.chevronDataProvider.selectNone();
                            $timeout( function() {
                                $( 'body' ).off( 'click', $scope.hideChevronPopUp );
                            }, 200 );
                        }
                    }
                } );

                $scope.$watch( 'provider.crumbs', function _watchProviderCrumbs( newValue, oldValue ) {
                    if( !( _.isNull( newValue ) || _.isUndefined( newValue ) ) && newValue !== oldValue && $scope.breadcrumbConfig ) {
                        $scope.checkBreadcrumbOverflow();
                    }
                }, true );
            }
        ]
    };
} ] );
