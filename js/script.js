(function () {

  window.onload = function () {
    console.log('Fenster ist geladen.');


    ///////////////////////
    // DEFS
    //
    var margin = {top: 20, right: 0, bottom: 20, left: 0},
      pi = Math.PI,
      legendeLeft = 15,
      legendeTop = 0,
      //w = 532,
      w = 570 - margin.left - margin.right,
      h = 640 - margin.top - margin.bottom,
      map,
      latOrg,
      lngOrg,
      zoomOrg,
      lat,
      lng,
      zoom,
      zoomLev,
      colorScale;

    var ch_DE = {
        "decimal": ".",
        "thousands": "'",
        "grouping": [3],
        "currency": ["CHF", " "],
        "dateTime": "%a %b %e %X %Y",
        "date": "%d.%m.%Y",
        "time": "%H:%M:%S",
        "periods": ["AM", "PM"],
        "days": ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
        "shortDays": ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
        "months": ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
        "shortMonths": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    };

    var chFormat = d3.formatLocale(ch_DE);


    var query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX schema: <http://schema.org/>
PREFIX gn: <http://www.geonames.org/ontology#>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX dct: <http://purl.org/dc/terms/>

PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX pq: <http://www.wikidata.org/prop/qualifier/>
PREFIX ps: <http://www.wikidata.org/prop/statement/>
PREFIX p: <http://www.wikidata.org/prop/>

PREFIX qb: <http://purl.org/linked-data/cube#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX dataset: <https://ld.stadt-zuerich.ch/statistics/dataset/>
PREFIX measure: <https://ld.stadt-zuerich.ch/statistics/measure/>
PREFIX dimension: <https://ld.stadt-zuerich.ch/statistics/property/>
PREFIX code: <https://ld.stadt-zuerich.ch/statistics/code/>

SELECT ?item ?Bild ?fountainCoord ?fountainCoordColor ?WKT ?Coords ?WKTColor ?CoordsColor ?QuarterLabel ?Population ?WKTQuarter ?WKTQuarterColor
WHERE {
    SERVICE <https://ld.geo.admin.ch/query> {

SELECT ?WKT ?Coords ?WKTColor ?CoordsColor WHERE {
?Municipality a gn:A.ADM3 ;
  dct:isVersionOf ?Mainmun ;
  schema:name ?Name ;
  dct:issued ?Date ;
  gn:parentADM1 <https://ld.geo.admin.ch/boundaries/canton/1:2018> ;
  geo:hasGeometry ?Geometry .
#?InCanton schema:name ?CantonName .
?Geometry geo:asWKT ?WKT .
FILTER (?Date = "2018-01-01"^^xsd:date)
 #FILTER (?Name IN ("Zürich", "Uster"))                                                       
 #FILTER (?CantonName = "Bern")     
  
  ?stop rdf:type  <http://vocab.gtfs.org/terms#Stop> ;
   <http://www.w3.org/2003/01/geo/wgs84_pos#lat> ?lat ;
   <http://www.w3.org/2003/01/geo/wgs84_pos#long> ?long ;
   <http://schema.org/containedInPlace> ?Mainmun ;
   <https://ld.geo.admin.ch/def/transportation/meansOfTransportation> <https://ld.geo.admin.ch/codelist/MeansOfTransportation/8> .

  #Filter (?muni = <https://ld.geo.admin.ch/boundaries/municipality/261>)  
  BIND(CONCAT('POINT(' , STR(?long), ' ', STR(?lat) , ')')  as ?Coords ) .
      BIND("#999999" AS ?WKTColor)
      BIND("#0000FF" AS ?CoordsColor)
}       

     }

  SERVICE <https://query.wikidata.org/bigdata/namespace/wdq/sparql> {

SELECT ?item ?Bild ?fountainCoord ?fountainCoordColor WHERE {
  ?item p:P528 ?statement.
  ?statement pq:P972 wd:Q53629101.
  ?item wdt:P18 ?Bild.
  ?item wdt:P625 ?fountainCoord. 
      BIND("#00FF00" AS ?fountainCoordColor) .
} 

} 


  ?sub a qb:Observation ;
       qb:dataSet dataset:BEW-RAUM-ZEIT ;
       measure:BEW ?Population ;
       dimension:RAUM ?Quarter ;
       dimension:ZEIT ?Zeit .
  ?Quarter owl:sameAs ?WikidataUID ;
        skos:broader code:Quartier ;
        rdfs:label ?QuarterLabel .  
  ?Quarter geo:hasGeometry ?GeoQuarter .
  ?GeoQuarter geo:asWKT ?WKTQuarter .
  FILTER(year(?Zeit) = 2017) .
  BIND("#FF0000" AS ?WKTQuarterColor) .
  
  } LIMIT 200`;
    var endPoint = "https://ld.stadt-zuerich.ch/query";

    //Main render function
    d3.sparql(endPoint, query, function(error, data) {
      if (error) throw error;
        console.log(data);
      


      for (i=0;i<data.length;i++) {
        var newObj = {};
        newObj.properties = {};

        // "features": [
        //   {
        //     "type": "Feature",
        //     "geometry": {
        //       "type": "Polygon",
        //       "coordinates": [

        newObj.properties.municipality= data[i].Municipality;
        newObj.properties.name= data[i].Name;
        newObj.properties.population= data[i].Population.valueOf();
        newObj.type = 'Feature';

        var wkt = new Wkt.Wkt();
        wkt.read(data[i].WKT);
        newObj.geometry = wkt.toJson();
        newData.push(newObj);
        //console.log(JSON.stringify(newData));
      }



      addLmaps();
      console.log('maps added');
      //karteZ();
      
      drawFeatures(newData); 

      map.addControl(new customControl1());
    })

    //add the custom reset zoom button
    var customControl1 =  L.Control.extend({
        options: {
            position: 'topright'
        },

        onAdd: function (map) { 

            var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            container.innerHTML = 'Reset Zoom'
            container.style.backgroundColor = 'white';
            container.style.padding = '5px';

            container.onclick = function(){
                resetZoom();

            }

            return container;
        }
    });

    //reset zoom function
    function resetZoom() {
        ebene = 'gem';
        map.setView([latOrg, lngOrg], zoomOrg);
        d3.selectAll('.image').remove();
        //d3.selectAll('.gemeinde').style('fill-opacity', 0.3);
    }

    //define the transformation of the coodrinates so that leaflet understands them
    function projectPoint(x, y) {
        var point = map.latLngToLayerPoint(new L.LatLng(y, x));
        this.stream.point(point.x, point.y);
    }

    //Add the OpenStreetMap Layer via leaflet    
    function addLmaps() {
        latOrg = 47.43;
        lngOrg = 8.64;
        zoomOrg = 10;
        map = L.map('map').setView([latOrg, lngOrg], zoomOrg);

        //OpenStreetMap_BlackAndWhite
        L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
         maxZoom: 18,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);
        map._initPathRoot();
        
    } 


    //draw the data
    function drawFeatures(mapData) {
      var svg = d3.select('#map').select('svg');
      var svgMap = svg.append('g').attr('id', 'svgMap');



      var transform = d3.geoTransform({point: projectPoint});
      var path = d3.geoPath().projection(transform);


      var featureElement = svgMap.selectAll('path.gemeinde')
        .data(mapData)
        .enter()
        .append("path")
        .attr("d", path)
        .attr('class', 'gemeinde')
      .attr('cursor', 'pointer')
        .style('stroke-width', 0.5)
        .style('fill', function(d) {
          return colorScale(d.properties.population);
        })
        .on('mouseover', function(d) {
          //console.log(d.properties.name);
          var bBox = d3.select(this).node().getBBox();
          //console.log(bBox);
          svgMap.append('text')
            .attr('class', 'mouse')
            .attr('x', bBox.x+bBox.width/2)
            .attr('y', bBox.y+bBox.height/2)
            .text(d.properties.name+': '+chFormat.format(',')(d.properties.population));
        })
        .on('mouseout', function() {
          //undo what ever you wanted to do with your Map-Data on Mouse-Out
          d3.selectAll('.mouse').remove();
        })
        .on('click', function() {
          //or maybe some click-action?
        });
          


        //some map functionality
        map.on('viewreset', update);
        //update();
        map.on("zoomend", function(){
            zoomLev = map.getZoom();
        });

        //update the svg-stuff when the leaflet-map gets zoomed or moved
        function update() { 
          console.log('idate')
          featureElement.attr('d', path);
          //Move Circles when Map moves
        }
      //})
    }
  };
}());
