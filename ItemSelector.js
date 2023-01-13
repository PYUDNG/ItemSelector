(function() {
	// function DoLog() {}
	// Arguments: level=LogLevel.Info, logContent, trace=false
	const [LogLevel, DoLog] = (function() {
		const LogLevel = {
			None: 0,
			Error: 1,
			Success: 2,
			Warning: 3,
			Info: 4,
		};
		
		return [LogLevel, DoLog];
		function DoLog() {
			// Get window
			const win = (typeof(unsafeWindow) === 'object' && unsafeWindow !== null) ? unsafeWindow : window;

			const LogLevelMap = {};
			LogLevelMap[LogLevel.None] = {
				prefix: '',
				color: 'color:#ffffff'
			}
			LogLevelMap[LogLevel.Error] = {
				prefix: '[Error]',
				color: 'color:#ff0000'
			}
			LogLevelMap[LogLevel.Success] = {
				prefix: '[Success]',
				color: 'color:#00aa00'
			}
			LogLevelMap[LogLevel.Warning] = {
				prefix: '[Warning]',
				color: 'color:#ffa500'
			}
			LogLevelMap[LogLevel.Info] = {
				prefix: '[Info]',
				color: 'color:#888888'
			}
			LogLevelMap[LogLevel.Elements] = {
				prefix: '[Elements]',
				color: 'color:#000000'
			}

			// Current log level
			DoLog.logLevel = (win.isPY_DNG && win.userscriptDebugging) ? LogLevel.Info : LogLevel.Warning; // Info Warning Success Error

			// Log counter
			DoLog.logCount === undefined && (DoLog.logCount = 0);

			// Get args
			let [level, logContent, trace] = parseArgs([...arguments], [
				[2],
				[1,2],
				[1,2,3]
			], [LogLevel.Info, 'DoLog initialized.', false]);

			// Log when log level permits
			if (level <= DoLog.logLevel) {
				let msg = '%c' + LogLevelMap[level].prefix + (typeof GM_info === 'object' ? `[${GM_info.script.name}]` : '') + (LogLevelMap[level].prefix ? ' ' : '');
				let subst = LogLevelMap[level].color;

				switch (typeof(logContent)) {
					case 'string':
						msg += '%s';
						break;
					case 'number':
						msg += '%d';
						break;
					default:
						msg += '%o';
						break;
				}

				if (++DoLog.logCount > 512) {
					console.clear();
					DoLog.logCount = 0;
				}
				console[trace ? 'trace' : 'log'](msg, subst, logContent);
			}
		}
	}) ();

	window.ItemSelector = ItemSelector;

	function ItemSelector(useWrapper=true) {
		const IS = this;
		const DATA = {
			showing: false, json: null, data: null, options: null
		};
		const elements = IS.elements = {};
		defineGetter(IS, 'showing', () => DATA.showing);
		defineGetter(IS, 'json', () => MakeReadonlyObj(DATA.json));
		defineGetter(IS, 'data', () => MakeReadonlyObj(DATA.data));
		defineGetter(IS, 'options', () => MakeReadonlyObj(DATA.options));
		IS.show = show;
		IS.close = close;
		IS.getSelectedItems = getSelectedItems;
		init();

		function init() {
			const wrapper = useWrapper ? (function() {
				const wrapper = elements.wrapper = $CrE(randstr(4, false, false) + '-' + randstr(4, false, false));
				const shadow = wrapper.attachShadow({mode: 'closed'});
				document.body.appendChild(wrapper);
				return shadow;
			}) () : document.body;
			const container = elements.container = $CrE('div');
			const header = elements.header = $CrE('div');
			const body = elements.body = $CrE('div');
			const footer = elements.footer = $CrE('div');
			container.classList.add('itemselector-container');
			header.classList.add('itemselector-header');
			body.classList.add('itemselector-body');
			footer.classList.add('itemselector-footer');
			container.appendChild(header);
			container.appendChild(body);
			container.appendChild(footer);
			wrapper.appendChild(container);

			const title = elements.title = $CrE('span');
			title.classList.add('itemselector-title');
			header.appendChild(title);

			const list = elements.list = $CrE('pre');
			list.classList.add('itemselector-list');
			body.appendChild(list);

			const btnOK = $CrE('button');
			const btnCancel = $CrE('button');
			const btnClose = $CrE('button');
			btnOK.innerText = 'OK';
			btnCancel.innerText = 'Cancel';
			btnClose.innerText = 'x';
			btnOK.className = 'itemselector-button itemselector-button-ok';
			btnCancel.className = 'itemselector-button itemselector-button-cancel';
			btnClose.className = 'itemselector-button itemselector-button-close';
			$AEL(btnOK, 'click', ok_onClick);
			$AEL(btnCancel, 'click', cancel_onClick);
			$AEL(btnClose, 'click', close_onClick);
			header.appendChild(btnClose);
			footer.appendChild(btnCancel);
			footer.appendChild(btnOK);
			elements.button = {btnOK, btnCancel, btnClose};

			const cssParent = useWrapper ? wrapper : document.head;
			['ItemSelector.css', 'ItemSelector-theme.css'].forEach(href => {
				const link = $CrE('link');
				link.rel = 'stylesheet';
				link.type = 'text/css';
				link.href = href;
				cssParent.appendChild(link);
			});

			function ok_onClick(e) {
				if (!DATA.showing) {
					DoLog(LogLevel.Warning, 'ok_onClick invoked when dialog is not showing');
					return false;
				}
				if (!DATA.options) {
					DoLog(LogLevel.Warning, 'DATA.options missing while ok_onClick invoked');
					return false;
				}
				typeof DATA.options.onok === 'function' && DATA.options.onok.call(this, e, getSelectedItems());
				close();
			}

			function cancel_onClick(e) {
				if (!DATA.showing) {
					DoLog(LogLevel.Warning, 'cancel_onClick invoked when dialog is not showing');
					return false;
				}
				if (!DATA.options) {
					DoLog(LogLevel.Warning, 'DATA.options missing while cancel_onClick invoked');
					return false;
				}
				typeof DATA.options.oncancel === 'function' && DATA.options.oncancel.call(this, e, getSelectedItems());
				close();
			}

			function close_onClick(e) {
				if (!DATA.showing) {
					DoLog(LogLevel.Warning, 'close_onClick invoked when dialog is not showing');
					return false;
				}
				if (!DATA.options) {
					DoLog(LogLevel.Warning, 'DATA.options missing while close_onClick invoked');
					return false;
				}
				typeof DATA.options.onclose === 'function' && DATA.options.onclose.call(this, e, getSelectedItems());
				close();
			}
		}

		function show(json, options={title: ''}) {
			// Status check & update
			if (!json) {
				DoLog(LogLevel.Error, 'json missing');
				return false;
			}
			if (DATA.showing) {
				DoLog(LogLevel.Error, 'show invoked while DATA.showing === true');
				return false;
			}
			DATA.showing = true;
			DATA.options = options;
			DATA.json = structuredClone(json);
			DATA.data = makeData(json);

			// elements
			const {container, header, title, body, footer, list} = elements;

			// make new <ul>
			const ul = makeListItem(json);
			ul.classList.add('itemselector-item-root');
			[...list.children].forEach(c => c.remove());
			list.appendChild(ul);

			// configure with options
			options.hasOwnProperty('title') && (title.innerText = options.title);

			// display container
			updateElementSelect();
			container.classList.add('itemselector-show');

			return IS;

			function makeListItem(json_item, path=[]) {
				const item = pathItem(path);
				const hasChild = Array.isArray(item.children);

				// create new ul>li
				const ul = item.elements.ul = $CrE('ul');
				const li = item.elements.li = $CrE('li');
				ul.classList.add('itemselector-item');
				hasChild && ul.classList.add('itemselector-item-parent');
				ul.appendChild(li);

				// triangle toggle for folder items
				const toggle = item.elements.toggle = $CrE('a');
				toggle.classList.add('itemselector-toggle');
				hasChild && toggle.classList.add('itemselector-show');
				$AEL(toggle, 'click', e => {
					destroyEvent(e);
					ul.classList[[...ul.classList].includes('itemselector-item-collapsed') ? 'remove' : 'add']('itemselector-item-collapsed');
				});
				li.appendChild(toggle);

				// checkbox for selecting
				const checkbox = item.elements.checkbox = $CrE('input');
				checkbox.type = 'checkbox';
				checkbox.classList.add('itemselector-checker');
				$AEL(checkbox, 'change', checkbox_onChange);
				li.appendChild(checkbox);

				// item text
				const text = item.elements.text = $CrE('span');
				text.classList.add('itemselector-text');
				text.innerText = json_item.text;
				li.appendChild(text);

				// make child items
				if (hasChild) {
					item.elements.children = [];
					for (let i = 0; i < json_item.children.length; i++) {
						const childItem = makeListItem(json_item.children[i], [...path, i]);
						item.elements.children.push(childItem);
						li.appendChild(childItem);
					}
				}

				return ul;

				function checkbox_onChange(e) {
					// set select status
					item.selected = checkbox.checked;

					// update element
					updateElementSelect();
				}
			}
		}

		function close() {
			if (!DATA.showing) {
				DoLog(LogLevel.Error, 'show invoked while DATA.showing === false');
				return false;
			}
			DATA.showing = false;
			DATA.options = null;

			elements.container.classList.remove('itemselector-show');
		}

		function updateElementSelect() {
			//const data = DATA.data;
			update(DATA.data);

			function update(item) {
				// item elements
				const elements = item.elements;
				const checkbox = elements.checkbox;

				// props
				checkbox.checked = item.selected;
				checkbox.indeterminate = item.childSelected && !item.selected;

				// update children
				if (Array.isArray(item.children)) {
					for (const child of item.children) {
						update(child);
					}
				}
			}
		}

		function getSelectedItems() {
			const json = structuredClone(DATA.json);
			const data = DATA.data;
			const MARK = Symbol('cut-mark');

			mark(json, data);
			return cut(json);

			function mark(json_item, data_item) {
				if (!data_item.selected && !data_item.childSelected) {
					json_item[MARK] = true;
				} else if (Array.isArray(data_item.children)) {
					for (let i = 0; i < data_item.children.length; i++) {
						mark(json_item.children[i], data_item.children[i]);
					}
				}
			}

			function cut(json_item) {
				if (json_item[MARK]) {
					return null;
				} else {
					const children = json_item.children;
					if (Array.isArray(children)) {
						for (const cutchild of children.filter(child => child[MARK])) {
							children.splice(children.indexOf(cutchild), 1);
						}
						children.forEach((child, i) => {
							children[i] = cut(child);
						});
					}
					return json_item;
				}
			}
		}

		function pathItem(path) {
			return pathObj(DATA.data, path);
		}

		function pathObj(obj, path) {
			let target = obj;
			const _path = [...path];
			while (_path.length) {
				target = target.children[_path.shift()];
			}
			return target;
		}

		function makeData(json) {
			return proxyItemData(makeItemData(json));

			function proxyItemData(data) {
				return typeof data === 'object' && data !== null ? new Proxy(data, {
					get: function(target, property, receiver) {
						const value = target[property];
						const noproxy = typeof value === 'object' && value !== null && value['__NOPROXY__'] === true;
						return noproxy ? value : proxyItemData(value);
					},
					set: function(target, property, value, receiver) {
						switch (property) {
							case 'selected':
								// set item and its children's selected status by rule
								select(target, value, !value);
								break;
							default:
								// setting other props are not allowed
								break;
						}
						return true;

						function select(item, selected) {
							// write item
							item.selected = selected;

							// write children selected
							select_children(item)

							// write parent selected
							select_parent(item);

							// calculate children childSelected
							childSelected_children(item);

							// calculate parent childSelected
							childSelected_parent(item);

							function select_children(item) {
								if (Array.isArray(item.children)) {
									for (const child of item.children) {
										if (child.selected !== selected) {
											child.selected = selected;
											select_children(child, selected);
										}
									}
								}
							}

							function select_parent(item) {
								if (item.parent) {
									const parent = item.parent;
									const selected = parent.children.every(child => child.selected);
									if (parent.selected !== selected) {
										parent.selected = selected;
										select_parent(parent);
									}
								}
							}

							function childSelected_children(item) {
								if (Array.isArray(item.children)) {
									for (const child of item.children) {
										childSelected_children(child);
									}
									item.childSelected = item.children.some(child => child.selected || child.childSelected);
								} else {
									item.childSelected = false;
								}
							}

							function childSelected_parent(item) {
								if (item.parent) {
									const parent = item.parent;
									const childSelected = parent.children.some(child => child.selected || child.childSelected);
									if (parent.childSelected !== childSelected) {
										parent.childSelected = childSelected;
										childSelected_parent(parent);
									}
								}
							}
						}
					}
				}) : data;
			}

			function makeItemData(json, parent=null) {
				const hasChild = Array.isArray(json.children);
				const item = {};
				item.elements = {__NOPROXY__:true};
				item.selected = true;
				item.childSelected = hasChild && json.children.length > 0;
				item.parent = parent !== null && typeof parent === 'object' ? parent : null;
				if (hasChild) {
					item.children = json.children.map(child => makeItemData(child, item));
				}
				return item;
			}
		}

		function defineGetter(obj, prop, getter) {
			Object.defineProperty(obj, prop, {
				get: getter,
				set: v => true,
				configurable: false,
				enumerable: true,
			});
		}
	}

	// Basic functions
	// querySelector
	function $() {
		switch(arguments.length) {
			case 2:
				return arguments[0].querySelector(arguments[1]);
				break;
			default:
				return document.querySelector(arguments[0]);
		}
	}
	// querySelectorAll
	function $All() {
		switch(arguments.length) {
			case 2:
				return arguments[0].querySelectorAll(arguments[1]);
				break;
			default:
				return document.querySelectorAll(arguments[0]);
		}
	}
	// createElement
	function $CrE() {
		switch(arguments.length) {
			case 2:
				return arguments[0].createElement(arguments[1]);
				break;
			default:
				return document.createElement(arguments[0]);
		}
	}
	// addEventListener
	function $AEL(...args) {
		const target = args.shift();
		return target.addEventListener.apply(target, args);
	}

	// Just stopPropagation and preventDefault
	function destroyEvent(e) {
		if (!e) {return false;};
		if (!e instanceof Event) {return false;};
		e.stopPropagation();
		e.preventDefault();
	}

	function parseArgs(args, rules, defaultValues=[]) {
		// args and rules should be array, but not just iterable (string is also iterable)
		if (!Array.isArray(args) || !Array.isArray(rules)) {
			throw new TypeError('parseArgs: args and rules should be array')
		}

		// fill rules[0]
		(!Array.isArray(rules[0]) || rules[0].length === 1) && rules.splice(0, 0, []);

		// max arguments length
		const count = rules.length - 1;

		// args.length must <= count
		if (args.length > count) {
			throw new TypeError(`parseArgs: args has more elements(${args.length}) longer than ruless'(${count})`);
		}

		// rules[i].length should be === i if rules[i] is an array, otherwise it should be a function
		for (let i = 1; i <= count; i++) {
			const rule = rules[i];
			if (Array.isArray(rule)) {
				if (rule.length !== i) {
					throw new TypeError(`parseArgs: rules[${i}](${rule}) should have ${i} numbers, but given ${rules[i].length}`);
				}
				if (!rule.every((num) => (typeof num === 'number' && num <= count))) {
					throw new TypeError(`parseArgs: rules[${i}](${rule}) should contain numbers smaller than count(${count}) only`);
				}
			} else if (typeof rule !== 'function') {
				throw new TypeError(`parseArgs: rules[${i}](${rule}) should be an array or a function.`)
			}
		}

		// Parse
		const rule = rules[args.length];
		let parsed;
		if (Array.isArray(rule)) {
			parsed = [...defaultValues];
			for (let i = 0; i < rule.length; i++) {
				parsed[rule[i]-1] = args[i];
			}
		} else {
			parsed = rule(args, defaultValues);
		}
		return parsed;
	}

	function MakeReadonlyObj(val) {
		return isObject(val) ? new Proxy(val, {
			get: function(target, property, receiver) {
				return MakeReadonlyObj(target[property]);
			},
			set: function(target, property, value, receiver) {
				return true;
			}
		}) : val;

		function isObject(value) {
			return ['object', 'function'].includes(typeof value) && value !== null;
		}
	}

	// Returns a random string
	function randstr(length=16, nums=true, cases=true) {
		const all = 'abcdefghijklmnopqrstuvwxyz' + (nums ? '0123456789' : '') + (cases ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : '');
		return Array(length).fill(0).reduce(pre => (pre += all.charAt(randint(0, all.length-1))), '');
	}

	function randint(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
}) ();