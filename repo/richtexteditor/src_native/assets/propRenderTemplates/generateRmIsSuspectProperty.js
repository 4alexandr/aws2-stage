// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * native construct to hold the server version information related to the AW server release.
 *
 * @module propRenderTemplates/generateRmIsSuspectProperty
 * @requires app
 */
import app from 'app';
import cmm from 'soa/kernel/clientMetaModel';

var exports = {};

/**
 * Generates Suspect icon DOM Element for Summary Table Proxy object
 * @param { Object } vmo - ViewModelObject for which Suspect icon is being rendered
 * @param { Object } containerElem - The container DOM Element inside which Suspect icon will be rendered
 */
export let generateIsSuspectFlagRendererFn = function (vmo, containerElem) {
    var suspectProp = null;
    var hasSuspect = '0';
    if (vmo.props && vmo.props["awb0IsSuspect"]) {
        suspectProp = vmo.props["awb0IsSuspect"];
    }
    if (suspectProp && suspectProp.dbValues && suspectProp.dbValues.length > 0) {
        hasSuspect = suspectProp.dbValues[0];
    }

    if (cmm.isInstanceOf('Awb0Element', vmo.modelType) && hasSuspect) {
        _rendersuspectIndicator(containerElem, hasSuspect);
    }
};

/**
 * @param { Object } containerElem - The container DOM Element inside which Suspect icon will be rendered
 * @param {String} hasSuspect - 1 or 0
 */
var _rendersuspectIndicator = function (containerElem, hasSuspect) {
    var cellImg = document.createElement('img');
    cellImg.className = 'aw-visual-indicator aw-commands-command aw-requirementsmanager-summaryTableIcon';
    var imgSrc = null;
    if (hasSuspect === '1') {
        imgSrc = app.getBaseUrlPath() + '/image/indicatorSuspectLink16.svg';
        cellImg.src = imgSrc;
        containerElem.appendChild(cellImg);
    }
};

export default exports = {
    generateIsSuspectFlagRendererFn
};
app.factory('generateRmIsSuspectProperty', () => exports);
