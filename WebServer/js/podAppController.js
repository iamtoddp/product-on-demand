/*
 | Copyright 2015 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */

define([
    "dojo/dom",
    "dojo/on",
    "dojo/_base/lang",
    "dojo/i18n!./nls/podi18n",
    "dijit/Dialog",
    "js/podMap",
    "./SelectionTool",
    "./podSearch",
    "./ConfigurationManager",
	"esri/layers/FeatureLayer",
    "esri/request",
    "./ProductPanel",
    "./TabController",
    "dojo/domReady!"
], function (dom, on, lang, i18n, Dialog, Map, SelectionTool, podSearch, cfgManager, FeatureLayer, esriRequest) {

    var podMap;
    var selectionTool;

    return {
        startup: startup,
        initializeMap: initializeMap
    };

    function getCookie(cname) {
        var name = cname + "=";
        var ca = document.cookie.split(";");
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == " ") c = c.substring(1);
            if (c.indexOf(name) != -1) return c.substring(name.length, c.length);
        }
        return "";
    }

    function initializeMap() {

        cfgManager.validate();

        welcomeScreen();

        // Proceed to initialization
        podMap = new Map(dom.byId("map"));
        podMap.setMapCursor("url(images/pan.cur),auto");

        dom.byId("headerLogoImage").src = cfgManager.getApplicationSetting("logoImage");
        dom.byId("headerMainTitle").innerHTML = cfgManager.getApplicationSetting("applicationTitle");
        dom.byId("userGuideLink").innerHTML = i18n.podConfig.userGuideLink;
        dom.byId("mapServicesLink").innerHTML = i18n.podConfig.mapServicesLink;
        var subtitle = cfgManager.getApplicationSetting("applicationSubtitle", true);
        if (subtitle === undefined)
            dom.byId("headerMainTitle").style.marginTop = "12px";
        else
            dom.byId("headerSubtitle").innerHTML = subtitle;

        podMap.resize();

        initSearch(podMap);

        selectionTool = SelectionTool.getInstance(podMap);

        var productPanel = new ProductPanel(podMap, selectionTool);

        podMap.onClick = function (event) {

            productPanel.showProduct(event.mapPoint, event.ctrlKey);
            selectionTool.onMapClicked(event);
        };

        var tabController = new TabController(podMap);
        tabController.initialize();

        on(dom.byId("userGuideLink"), "click", function (event) {
            var e = event || window.event; // for IE
            if (e.preventDefault) {
                e.preventDefault();
            }
            window.open("UserGuide.html", "UserGuide", "", true);
        });
    }

    function addLayerToSearch(layer, search) {
        var layerUrl = layer.sublayer == 'undefined' ? layer.url : layer.url + "/" + layer.sublayer;
        var fields = [];
        for (var ind = 0; ; ind++) {
            fieldAtr = "data" + ind;
            if (layer[fieldAtr])
                fields.push(layer[fieldAtr]);
            else
                break;
        }

        esriRequest({
            url: layerUrl,
            content: { f: "json" },
            callbackParamName: "callback",
            load: function (response) {
                var layerFileds = response.fields;
                var fieldsForSearch = [];
                for (var i = 0; i < fields.length; i++) {
                    for (var j = 0; j < response.fields.length; j++) {
                        if (fields[i] === response.fields[j].name && response.fields[j].type == 'esriFieldTypeString') {
                            fieldsForSearch.push(fields[i]);
                            break;
                        }
                    }
                }
                search.addSourceLayer({
                    title: layer.value,
                    url: layerUrl,
                    searchFields: fieldsForSearch.length > 0 ? fieldsForSearch : ['*'],
                    displayFiled: fieldsForSearch.length > 0 ? fieldsForSearch[0] : ''
                });
            },
        });
    }

    function initSearch(podMap) {

        var search = new podSearch({
            enableButtonMode: false, //this enables the search widget to display as a single button
            enableLabel: true,
            enableInfoWindow: true,
            enableHighlight: true,
            showInfoWindowOnSelect: true,
            maxSuggestions: 20,
            map: podMap.map
        }, "search");
        search.startup([], [{ title: "Esri World Geocoder", url: cfgManager.getApplicationSetting("geocodeServiceUrl") }]);

        var extentLayerDomains = cfgManager.getTableProperties("extentLayer", "domain");
        var extentLayerDomain = cfgManager.getTable(extentLayerDomains);
        for (var layerAtr in extentLayerDomain) {
            var layer = extentLayerDomain[layerAtr];
            addLayerToSearch(layer, search);
        }
    }


    function startup() {

        var s = window.location.search.substring(1);
        if (s == "services") {

            var loc = window.location.href;
            loc = loc.replace("\\", "/");
            var ind = loc.lastIndexOf("/");
            if (ind != -1) {

                loc = loc.slice(0, ind + 1);
                loc += "POD_" + s + ".html";
                window.location = loc;
            }
        }
    }

    function welcomeScreen() {

        if (!cfgManager.getApplicationSetting("isSplash"))
            return;

        var contact = "";
        if (cfgManager.getApplicationSetting("isSplashContactInfo"))
            contact = "<div><a href=mailto:" + cfgManager.getApplicationSetting("splashEmail") + ">" + cfgManager.getApplicationSetting("splashEmailDesc") + "</a></div><div><a target='_blank' href=" + cfgManager.getApplicationSetting("splashWebsite") + ">" + cfgManager.getApplicationSetting("splashWebsiteDesc") + "</a></div>";

        var myConfirmDialog = new Dialog({
            id: "DisclaimerDialog",
            title: cfgManager.getApplicationSetting("splashTitle"),
            content: "<div>" + cfgManager.getApplicationSetting("splashText") + "<br><br>" + contact + "</div><br><br><button id='btnClickMe' type='button' style='float: right;'>OK</button><input type='checkbox' id='doNotShow'>" + cfgManager.getApplicationSetting("splashDoNotShow") + "</div>",
            draggable: true,
            closable: false
        });

        document.getElementById("btnClickMe").onclick = function () {

            myConfirmDialog.hide();
        };

        document.getElementById("doNotShow").onchange = function () {

            if (document.getElementById("doNotShow").checked)
                document.cookie = "string=podcookied; expires=Wed, 28 Oct 2020 00:00:00 UTC";
            else
                document.cookie = "string=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
        };

        if (getCookie("string") != "podcookied")
            myConfirmDialog.show();
    }
});