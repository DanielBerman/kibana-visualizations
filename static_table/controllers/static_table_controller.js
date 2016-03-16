define(function (require) {

  var module = require('modules').get('kibana/static_table', ['kibana']);
  module.controller('KbnStaticTableController', function ($scope, Private, courier, config) {

    var SearchSource = Private(require('components/courier/data_source/search_source'));
    var CallClient = Private(require('components/courier/fetch/_call_client'));
    var searchStrategy = Private(require('components/courier/fetch/strategy/search'));

    init();

    // Init data and params
    function init() {
      if ($scope.init) {
        return;
      }
        $scope.searchIndex = $scope.searchIndex ? $scope.searchIndex : config.get('defaultIndex');
        $scope.vis.params.resultLimit = $scope.vis.params.resultLimit ? $scope.vis.params.resultLimit : 1;
        $scope.vis.params.filters = $scope.vis.params.filters ? $scope.vis.params.filters : {};
        buildFieldsArray();
        $scope.init = true;
        $scope.state = "load";
    }

    // Builds an array of all the possible fields.
    function buildFieldsArray() {
      if (!$scope.data) {
        var fieldsArr = [];
        $scope.data = {};

        courier.indexPatterns.get($scope.searchIndex).then(function(indexPattern) {
          indexPattern.fields.forEach(function(elem, index) {
            // Can filter which fields are optional for filtering(regex maybe).
            fieldsArr.push(elem.displayName);
          });

          if (fieldsArr.length > 0) {
            $scope.data.fieldsArr = fieldsArr.sort();

            if (!$scope.filteredField) {
              $scope.filteredField = fieldsArr[0];
            }
          }
        })
      }
    }

    $scope.$watch('esResponse', getData);

    // Get the data for the widget table.
    function getData(resp) {

      if (resp) {

        $scope.dataTableList = [];

        searchES().then(function(res) {
          if (res[0].hits.total > 0) {
            $scope.state = "full";
            res[0].hits.hits.forEach(function (elem) {
              buildResultTable(elem._source);
            })
          } else {
            $scope.state = "empty";
          }
        });
      }
    }

    // Executes the query.
    function searchES() {
      var tableSearch = new SearchSource();

      tableSearch
                .size($scope.vis.params.resultLimit)
                .query(buildQuery());

      var tableRequest = tableSearch._createRequest();
      return CallClient(searchStrategy, [tableRequest]).then(function(results) {
          return results;
      });
    }

    // Fetch the results to the widget table.
    function buildResultTable(hits) {

      var dataTable = {};

      // Parse the alias table in case its configured.
      var alias = parseAliasTable(hits);

      dataTable.data = alias ? alias : hits

      $scope.dataTableList.push(dataTable);
    }

    // Adds a new created filter to the filter list.
    $scope.addFilter = function(val) {

      // Spoj: might need to add more validations for this filter to prevent haxxx
      if (val) {
        $scope.vis.params.filters[$scope.filteredField] = val;
        $scope.filterValue = "";
      }
    }

    // Removes configured filter from the filter list.
    $scope.removeFilter = function(val) {
      delete $scope.vis.params.filters[val];
    }

    // Parse the alias list to the result fields.
    // An empty list will result the full query result to show.
    function parseAliasTable(hits) {

      var newDataList;

      if ($scope.vis.params.alias) {

        try {
          var alias = JSON.parse($scope.vis.params.alias);
        } catch(err) {
          return newDataList;
        }

        newDataList = {};

        for (key in hits) {

          var val = alias[key];

          if (val) {
            newDataList[val] = hits[key];
          }
        }
      }

      return newDataList;
    }

    // Build the query tag for the ES query.
    function buildQuery() {
      var query = 
      {
        "filtered": {
          "filter": {
            "bool": {
              "must": []
            }
          }
        }
      };

      // Add the configured filters to the ES query.
      for (key in $scope.vis.params.filters) {
        query.filtered.filter.bool.must.push(addFilter(key, $scope.vis.params.filters[key]));
      }

      return query;
    }

    // Add a filter block to the ES query
    function addFilter(key, value) {
      var filter = 
      {
        "query": {
          "match": {}
        }
      }

      filter.query.match[key] = 
      {
        "query": value,
        "type": "phrase"
      }

      return filter;
    }

  });
});