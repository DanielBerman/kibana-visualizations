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
        $scope.state = "full";
        $scope.searchIndex = $scope.searchIndex ? $scope.searchIndex : config.get('defaultIndex');
        $scope.vis.params.resultLimit = $scope.vis.params.resultLimit ? $scope.vis.params.resultLimit : 1;
        $scope.vis.params.filters = $scope.vis.params.filters ? $scope.vis.params.filters : {};
        $scope.vis.params.colorEnabled = $scope.vis.params.colorEnabled ? $scope.vis.params.colorEnabled : false;
        buildFieldsArray();
        $scope.init = true;
    }

    // Builds an array of all the possible fields.
    function buildFieldsArray() {
      if (!$scope.data) {
        var fieldsArr = [];
        var dateFieldsArr = [];
        $scope.data = {};

        // The courier needs time to initialize.
        setTimeout(function() {
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
        }, 500);
      }
    }

    $scope.$watch('esResponse', getData);

    function shrinkName(stringToShrink) {
      var labelMaxLength = 12;

      return (stringToShrink.length > labelMaxLength ? stringToShrink.substring(0, labelMaxLength) + '..' : stringToShrink);
    }

    function showData (resultsSet) {

        var tasks = [];
        var taskNames = [];
        var colorFields = [];

        resultsSet.forEach(function (elem, idx) {

          var newBlock = {};

          newBlock["startDate"] = new Date(elem.start);
          newBlock["endDate"] = new Date(elem.end);
          newBlock["taskName"] = shrinkName(elem.name);

          // If breakby field enabled then get field for color.
          if ($scope.vis.params.colorEnabled) {
            newBlock["color"] = elem.color;

            if (colorFields.indexOf(elem.color) == -1) {
              colorFields.push(elem.color);
            }
          }

          // Add the task name to the list
          if (taskNames.indexOf(newBlock["taskName"]) == -1) {
            taskNames.push(newBlock["taskName"]);
          }

          tasks.push(newBlock);
        })

        tasks.sort(function(a, b) {
            return a.endDate - b.endDate;
        });

        tasks.sort(function(a, b) {
            return a.startDate - b.startDate;
        });

        var startTime = datemath.parse(globalState.time.from);
        var endTime = datemath.parse(globalState.time.to);

        // On quick mode filters from and to structure is abit different.
        if ((globalState.time.mode === 'quick') && (globalState.time.from === globalState.time.to)) {
          // On part of the quick mode filters special manipulation is required(Ex: day before yesterday).
          if (globalState.time.from.indexOf('-') > -1) {

            // Get the relative time to add for the correct time range.
            var fromParts = globalState.time.from.split('-');
            var relativeParts = fromParts[1].match(/([0-9]+)([smhdwMy]).*/);
            endTime.add('1', relativeParts[2]);

          } else { // Filters that does not contain dash just need a fixed endtime.
             endTime = datemath.parse('now');
          }
        }

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
          .ticks(ticks)
          .timeDomainMode("fixed")
          .timeDomain(new Date(startTime.format()), new Date(endTime.format()));

        // If color breakby enabled then use the Kibana color factory as a color function.
        if ($scope.vis.params.colorEnabled) {
          // Trying to parse the alias json
          var colorConf;
          try {
            if ($scope.vis.params.colorAlias) {
              colorConf = JSON.parse($scope.vis.params.colorAlias);
            }
          } catch (ex) {
            // Display to user?
            //console.log('Failed to parse color configuration');
          }

          gantt.colorFunction(function (colorField) {
            // If current field located in the color configuration
            if (colorConf) {
              if (colorConf[colorField]) { return colorConf[colorField]; }
            }

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

        if ($scope.vis.params.filterValue) {
          searchES().then(function(res) {
            if (res[0].hits) {
              if (res[0].hits.total > 0) {
                $scope.state = "full";
                buildResultSet(res[0].hits.hits);
              } else {
                $scope.state = "empty";
              }
            } else {
              $scope.state = "empty";
            }
          })
        } else {
          $scope.state = "empty";
        }
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

      // Sometimes the widget panel isn't set yet and it's size doesn't fit the chart
      // A small timeout fixes it by giving time to the panel to resize.
      setTimeout(function () {
        showData(resultsSet);
      }, 200);
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