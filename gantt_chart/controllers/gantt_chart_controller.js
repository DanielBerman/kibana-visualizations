define(function (require) {

  var module = require('modules').get('kibana/gantt_chart', ['kibana']);
  module.controller('KbnGanttChartController', function ($scope, Private, courier, config, globalState) {

    var SearchSource = Private(require('components/courier/data_source/search_source'));
    var CallClient = Private(require('components/courier/fetch/_call_client'));
    var searchStrategy = Private(require('components/courier/fetch/strategy/search'));
    var datemath = require('utils/datemath');
    var color = Private(require('components/vislib/components/color/color'));

    init();

    // Init data and params
    function init() {
      if ($scope.init) {
        return;
      }
        $scope.searchIndex = $scope.searchIndex ? $scope.searchIndex : config.get('defaultIndex');
        $scope.vis.params.resultLimit = $scope.vis.params.resultLimit ? $scope.vis.params.resultLimit : 1;
        $scope.vis.params.filters = $scope.vis.params.filters ? $scope.vis.params.filters : {};
        $scope.vis.params.colorEnabled = $scope.vis.params.colorEnabled ? $scope.vis.params.colorEnabled : false;
        buildFieldsArray();
        $scope.init = true;
        $scope.state = "load";
    }

    // Builds an array of all the possible fields.
    function buildFieldsArray() {
      if (!$scope.data) {
        var fieldsArr = [];
        var dateFieldsArr = [];
        $scope.data = {};

        courier.indexPatterns.get($scope.searchIndex).then(function(indexPattern) {
          indexPattern.fields.forEach(function(elem) {
            // Can filter which fields are optional for filtering(regex maybe).
            fieldsArr.push(elem.displayName);

            if (elem.type == 'date') {
              dateFieldsArr.push(elem.displayName);
            }
          });

          // Init params if empty.
          if (fieldsArr.length > 0) {
            $scope.data.fieldsArr = fieldsArr.sort();
            $scope.data.dateFieldsArr = dateFieldsArr;

            if (!$scope.vis.params.filteredField) {
              $scope.vis.params.filteredField = fieldsArr[0];
            }
            
            if (!$scope.vis.params.startDateField) {
              $scope.vis.params.startDateField = dateFieldsArr[0];
            }

            if (!$scope.vis.params.endDateField) {
              $scope.vis.params.endDateField = dateFieldsArr[0];
            }

            if (!$scope.vis.params.breakByField) {
              $scope.vis.params.breakByField = fieldsArr[0];
            }

            if (!$scope.vis.params.colorField) {
              $scope.vis.params.colorField = fieldsArr[0];
            }
          }
        })
      }
    }

    $scope.$watch('esResponse', getData);

    function showData (resultsSet) {

        var tasks = [];
        var taskNames = [];
        var colorFields = [];

        resultsSet.forEach(function (elem, idx) {

          var newBlock = {};
          newBlock["startDate"] = new Date(elem.start);
          newBlock["endDate"] = new Date(elem.end);
          newBlock["taskName"] = elem.name;

          // If breakby field enabled then get field for color.
          if ($scope.vis.params.colorEnabled) {
            newBlock["color"] = elem.color;

            if (colorFields.indexOf(elem.color) == -1) {
              colorFields.push(elem.color);
            }
          }

          // Add the task name to the list
          if (taskNames.indexOf(elem.name) == -1) {
            taskNames.push(elem.name);
          }

          tasks.push(newBlock);
        })

        tasks.sort(function(a, b) {
            return a.endDate - b.endDate;
        });
        var maxDate = tasks[tasks.length - 1].endDate;
        tasks.sort(function(a, b) {
            return a.startDate - b.startDate;
        });

        var startTime = datemath.parse(globalState.time.from);
        var endTime = datemath.parse(globalState.time.to);

        var timeDiff = moment.duration(endTime.diff(startTime)).asHours();
        var format;
        var ticks = 10

        if ((timeDiff <= 0)){
          format = "%H:%M:%S";
        } else if (timeDiff <= 24) {
          format = "%H:%M";
        } else {
          format = "%y-%m-%d %H:%M:%S";
          ticks = 5;
        }

        var gantt = d3.gantt()
          .taskTypes(taskNames)
          .tickFormat(format)
          .height(300) // TODO: proper size.
          .width(600)
          .ticks(ticks)
          .timeDomainMode("fixed")
          .timeDomain(new Date(startTime.format()), new Date(endTime.format()));

        // If color breakby enabled then use the Kibana color factory as a color function.
        if ($scope.vis.params.colorEnabled) {
          gantt.colorFunction(function (colorField) {
            return color(colorFields)(colorField);
          });
        }

        // Set tasks and container element.
        gantt(tasks, "#chart_div");
    }

    // Get the data for the widget table.
    function getData(resp) {

      if (resp) {

        $scope.dataTableList = [];

        searchES().then(function(res) {
          if (res[0].hits.total > 0) {
            $scope.state = "full";
            buildResultSet(res[0].hits.hits);
          } else {
            $scope.state = "empty";
            // TODO: proper empty rows.
            $("#chart_div").html('empty');
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
    function buildResultSet(hits) {

      var resultsSet = [];

      hits.forEach(function (elem, idx) {
        var newBlock = {};

        newBlock.start = elem._source[$scope.vis.params.startDateField];
        newBlock.end = elem._source[$scope.vis.params.endDateField];
        newBlock.name = elem._source[$scope.vis.params.breakByField];

        if ($scope.vis.params.colorEnabled) {
          newBlock.color = elem._source[$scope.vis.params.colorField];
        }

        resultsSet.push(newBlock);
      })

      //console.log(new Date(resultsSet[0].start));
      showData(resultsSet);
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
      }

      query.filtered.filter.bool.must.push(addFilter($scope.vis.params.filteredField, $scope.vis.params.filterValue));

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

    $scope.advanced = function () {
      console.log('test');
    }
  });
});