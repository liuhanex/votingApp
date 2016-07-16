// Controller for the poll list
function PollListCtrl($scope, Poll) {
	$scope.polls = Poll.query();
}

// Controller for an individual poll
function PollItemCtrl($scope, $routeParams, $http, socket, Poll) {
	$scope.poll = Poll.get({ pollId: $routeParams.pollId }),
	$scope.selectedValues = {};

	var currentView = 'null';

	socket.on('myvote', function(data) {
		console.dir(data);
		if (data._id === $routeParams.pollId) {
			$scope.poll = data;
		}
	});

	socket.on('vote', function(data) {
		console.dir(data);
		if (data._id === $routeParams.pollId) {
			if (currentView != 'null') {
				for (o in data.options) {
					if (data.options[o]._id == currentView) {
						$scope.option = data.options[o];
					}
				}
			
			} else {
				$scope.poll.choices = data.choices;
			}

			$scope.poll.totalVotes = data.totalVotes;
		}
	});

	$scope.vote = function() {
		var pollId = $scope.poll._id,
			choiceId = $scope.poll.userVote,
			userSelects = $scope.selectedValues,
			error_flag;

		if (choiceId) {
			for (o in $scope.poll.options) {
				if (userSelects[$scope.poll.options[o].text] === undefined) {
					error_flag = true;
					break; 
				}
			}

			if (!error_flag) {
				var voteObj = { 
					poll_id: pollId,
					choice: choiceId,
					selections: userSelects
				};
				socket.emit('send:vote', voteObj);

			} else {
				$scope.selectedValues = {};
				alert('Error: 有项目未进行选择');
			}	

		} else {

			$scope.selectedValues = {};
			alert('Error: 没有任何选项被选中');
		}
	};

	$scope.filter = function(optionId) {
		currentView = optionId;

		if (optionId == 'null') {
			$http({method: 'GET', url: '/polls/' + $routeParams.pollId})
				.success(function(data, status, headers, config) {
					if (!data.error) {
						$scope.poll = data;
					
					} else {
						alert('Error: 数据获取失败 请重试');
					}

				})
				.error(function(data, status, headers, config) {
					alert('Error: 数据获取失败 请重试');
				});

		} else {

			$http({method: 'GET', url: '/polls/' + $routeParams.pollId + '/' + optionId})
				.success(function(data, status, headers, config) {
					if (!data.error) {
						$scope.poll = data;

						for (o in data.options) {
							if (data.options[o]._id == optionId) {
								$scope.option = data.options[o];
							}
						}
						
					} else {
						alert('Error: 数据获取失败 请重试');
					}
				})
				.error(function(data, status, headers, config) {
					alert('Error: 数据获取失败 请重试');
				});
		}
	};

	$scope.generateFile = function() {
		$http({ method: 'GET', url: '/polls/' + $routeParams.pollId + '/download' })
			.success(function(data, status, headers, config) {
				if (!data.error) {
					var anchor = angular.element('<a/>');
					anchor.attr({
						href: 'data:attachment/xls; charset=utf-8,' + encodeURI(data),
						target: '_blank',
						download: $routeParams.pollId + '.xls'
					})[0].click();

				} else {
					alert('Error: 下载失败 请重试');
				}
				
			})
			.error(function(data, status, headers, config) {
				alert('Error: 下载失败 请重试');
			});
	};
}

// Controller for creating a new poll
function PollNewCtrl($scope, $location, Poll) {
	// Define an empty poll model object
	$scope.poll = {
		question: '',
		choices: [ {text: ''}, {text: ''}, {text: ''} ],
		options: [],
		category: ''
	};

	// Method to add an additional choice option
	$scope.addChoice = function() {
		$scope.poll.choices.push({ text: '' });
	};

	// Validate and save the new poll to the database
	$scope.createPoll = function() {
		var poll 		 = $scope.poll,
			genderOption = $scope.gender,
			ageOption    = $scope.age,
			cityOption   = $scope.city;

		// Check that a question was provided
		if (poll.question.length > 0) {
			var choiceCount = 0;

			// Loop through the choices, make sure at least 2 choices are provided
			for (var i = 0; i < poll.choices.length; i++) {
				var choice = poll.choices[i];

				if (choice.text.length > 0)
					choiceCount++;
			}

			if (choiceCount > 1) {
				// Check category value
				if (poll.category != '') {
					poll.category = '[' + poll.category + ']';
				}

				// Add selected options to the model
				if (genderOption) {
					poll.options.push({
						text: '性别',
						choices: [
							{
								text: '保密',
								votes: []
							},
							{
								text: '女',
								votes: []
							},
							{
								text: '男',
								votes: []
							}
						]
					});
				}

				if (ageOption) {
					poll.options.push({
						text: '年龄',
						choices: [
							{
								text: '<18',
								votes: []
							},
							{
								text: '18~25',
								votes: []
							},
							{
								text: '26~35',
								votes: []
							},
							{
								text: '36~45',
								votes: []
							},
							{
								text: '46~55',
								votes: []
							},
							{
								text: '56+',
								votes: []
							}
						]
					});
				}

				if (cityOption) {
					poll.options.push({
						text: '城市',
						choices: [
							{
								text: '北京',
								votes:[]
							},
							{
								text: '上海',
								votes: []
							},
							{
								text: '广州',
								votes: []
							},
							{
								text: '深圳',
								votes: []
							},
							{
								text: '香港',
								votes: []
							},
							{
								text: '台北',
								votes: []
							},
						]
					});
				}

				// Create a new poll from the model
				var newPoll = new Poll(poll);

				// Call API to save poll to the database
				newPoll.$save(function(p, resp) {
					if (!p.error)
						$location.path('polls'); // If there is no error, redirect to the main view
					else
						alert('Error: 创建失败');
				});

			} else {

				alert('Error: 请至少填写2个选项');
			}

		} else {

			alert('Error: 请输入问题');
		}
	};
}

// //Controller for downloading poll data
// function PollDLCtrl($routeParams, $location, DL) {

// 	DL.get({ pollId: $routeParams.pollId }, function(p, resp) {

// 		if (!p.error) {
// 			alert('success');

// 		} else {
// 			alert('Error: Can not download the file.');
// 			$location.path('poll/' + $routeParams.pollId);
// 		}
// 	});
// }


