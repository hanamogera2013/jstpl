/*--------------------------------------------------------------------------*
 *  
 *  jstpl.js
 *  
 *  MIT-style license. 
 *  
 *  2013 Hanamogera
 *  
 *--------------------------------------------------------------------------*/

jstpl = (function(){
    if (typeof window.console === "undefined") {
         window.console = {}
    }
    if (typeof window.console.log !== "function") {
         window.console.log = function () {}
    }
    return {
    	mode: null,
    	testdata: {},

		do_url: "",

		vars: {},
		objects: {},
		prefix: "data-tpl-",
		autoAssign: true,
		attributeAssign: true,
		replaceEval: true,
		prefixMap: 'MAP_',
		includeCache: true,
		prefixIncludeCache: 'jstpl.cache.',
		utils: {},
		__PROP_END__: null
	};
})();

jstpl.MODE_DESIGN = 1;
jstpl.MODE_TEST = 2;
jstpl.MODE_DEPLOY = 3;

jstpl.addTestData = function (key, data) {
	jstpl.testdata[key] = data;
};

jstpl.loadTestData = function (key) {
	if (key in jstpl.testdata) {
		jstpl.vars = jstpl.testdata[key];
	} else {
		console.log('ロード(' + key + ')できませんでした');
	}
};

jstpl.getSearchArgs = function () {
	var arg = {};
	var pair = location.search.substring(1).split('&');
	for(var i = 0; i < pair.length; i++) {
		var kv = pair[i].split('=');
		arg[kv[0]] = kv[1];
	}
	return arg;
};

jstpl.ValueManager = function(vars) {
	this.vars = vars;
	this.parseValue = function (eval_string) {
		var $result = undefined;
		if (jstpl.replaceEval) {
			eval_string = eval_string.replace(/^eval\s*\(|\Weval\s*\(/, "void(");
		}
		with(this.vars) {
			try {
				eval('$result = ' + eval_string);
				if ($.type($result) == 'object' && !$.isPlainObject($result)) {
					console.log("ignore:(" + $.type($result) + ") = " + eval_string);
					$result = undefined;
				} else {
					console.log("success:result(" + $.type($result) + ") = " + eval_string);
				}
			} catch(e) {
				console.log("fail:" + eval_string);
			}
		}
		return $result;
	};
	this.getValue = function (name) {
		return this.parseValue(name);
	}
	this.setValue = function (name, value) {
		this.vars[name] = value;
/*
		if (jstpl.replaceEval) {
			name = name.replace(/^eval\s*\(|\Weval\s*\(/, "void(");
		}
		var eval_string = '' + name + ' = value;';
		with(this.vars) {
			try {
				eval(eval_string);
				console.log("success:" + eval_string);
			} catch(e) {
				console.log('fail:' + eval_string);
			}
		}
*/
	}
};

jstpl.TemplateRender = function (valueManager, $obj, parent) {
	var attr_key_assigned = jstpl.prefix + "assigned";
	var attr_key_mapped = jstpl.prefix + "mapped";
	this.$e = $obj;
	var vman = valueManager;
	var self = this;
	this.defereds = [];
	this.parent = parent;
	this.keywords = ['assign', 'for', 'if', 'else', 'switch', 'case', 'default', 'map', 'save', 'save-remove', 'include', 'mapped', 'assigned'];

	var _removeTag = function (o) {
		if (o == null) return;
		if (o.tagName != 'SPAN') return;
		if (o.attributes.length > 0) return;
		$(o).replaceWith($(o).contents());
	};
	var _procSave = function (i, o) {
		var save_key = $(this).attr(jstpl.prefix + "save");
		if (save_key != null) {
			$(o).removeAttr(jstpl.prefix + "save");
			jstpl.objects[save_key] = $(this).clone();
		}
	};
	var _procSaveRemove = function (i, o) {
		var save_key = $(this).attr(jstpl.prefix + "save-remove");
		if (save_key != null) {
			$(o).removeAttr(jstpl.prefix + "save-remove");
			jstpl.objects[save_key] = $(this).clone();
			$(o).remove();
		}
	};
	var _procInclude = function (i, o) {
		var getAbsolutePath = function (path) {
			var e = document.createElement('span');  
			e.innerHTML = '<a href="' + path + '" />';  
			return e.firstChild.href;
		};
		(function (obj, url, $temp) {
			var dfd = $.Deferred();
			var appendInclude = function (data) {
				$(obj).removeAttr(jstpl.prefix + "include");
				new jstpl.TemplateRender(vman, $temp.append(data), self).proc().done(function () {
					$temp.replaceWith($temp.contents());
					_removeTag(obj);
					dfd.resolve();
				});
			};
			var absolute_path = getAbsolutePath(url);
			var data = null;
			if (window.sessionStorage && jstpl.includeCache) {
				data = window.sessionStorage.getItem(jstpl.prefixIncludeCache + absolute_path);
			}
			if (data != null) {
				appendInclude(data);
			} else {
				$.ajax({
					url: url,
					async: true,
					dataType: 'html',
					success: function (data) {
console.log('ajax complete');
						if (window.sessionStorage && jstpl.includeCache) {
							try {
								window.sessionStorage.setItem(jstpl.prefixIncludeCache + absolute_path, data);
							} catch(e) {
							}
						}
						appendInclude(data);
					}
				});
			}
			self.defereds.push(dfd.promise());

		})(o, $(o).attr(jstpl.prefix + "include"), $('<div/>').appendTo($(o)));
		
	};
	var _procFor = function (i, o) {
		if ($(o).parents("[" + jstpl.prefix + "for" + "]").length > 0) return;
		var args = $(o).attr(jstpl.prefix + "for").split(',');
		for(var i in args) {
			args[i] = $.trim(args[i]);
		}
		var loop_var = null;
		var index_var = null;
		var temp_var = null;
		if (args.length == 3) {
			loop_var = args[0];
			index_var = args[1];
			temp_var = args[2];
		} else if (args.length == 2) {
			loop_var = args[0];
			temp_var = args[1];
		} else {
			return;
		}
		if (index_var != null && !index_var.match(/^[0-9a-zA-Z_]+$/)) {
			// wrong variable name
			return;
		}
		if (!temp_var.match(/^[0-9a-zA-Z_]+$/)) {
			// wrong variable name
			return;
		}
		$last = $(o);
		var list_clone = [];
		var list_index = [];
		var list_var = [];
		var loop = vman.parseValue(loop_var);
		for(var i in loop) {
			list_index.push(i);
			list_var.push(loop[i]);
			var $clone = $(o).clone();
			$clone.removeAttr(jstpl.prefix + "for").insertAfter($last);
			list_clone.push($clone);
			$last = $clone;
		}
		
		var dfd = $.Deferred();
		var chain_proc = function (remains, list_index, list_var) {
			if (remains.length > 0) {
				var $clone = remains.shift();
				var index = list_index.shift();
				var varname = list_var.shift();
				if (index_var != null) {
					vman.setValue(index_var, index);
				}
				vman.setValue(temp_var, varname);
				new jstpl.TemplateRender(vman, $clone, self).proc().done(function () {
					_removeTag($clone.get(0));
					chain_proc(remains, list_index, list_var);
				});
			} else {
				dfd.resolve();
				$(o).remove();
			}
		};
		chain_proc(list_clone, list_index, list_var);
		self.defereds.push(dfd.promise());
	};
	var _procAttribute = function (i, o) {
		if (!o.attributes) return;
		var list_remove = [];
		for(var i = 0; i < o.attributes.length; i++) {
			var attr = o.attributes[i];
			if (!attr.name.match(/^data\-tpl\-(.*)$/)) continue;
			var attr_name = RegExp.$1;
			if ($.inArray(attr_name, self.keywords) >= 0) continue;
			$(o).attr(attr_name, vman.parseValue(attr.value));
			list_remove.push(attr.name);
		}
		for(var i = 0; i < list_remove.length; i++) {
			$(o).removeAttr(list_remove[i]);
		}
	};
	var _procIf = function (i, o) {
		var key = $(o).attr(jstpl.prefix + "if");
		var $else = $(o).next("[" + jstpl.prefix + "else" + "]");
		if (vman.parseValue(key)) {
			$else.remove();
		} else {
			$(o).remove();
		}
		$(o).removeAttr(jstpl.prefix + "if");
		$else.removeAttr(jstpl.prefix + "else");
		_removeTag(o);
		_removeTag($else.get(0));
	};
	var _procSwitch = function (i, o) {
		var key = $(o).attr(jstpl.prefix + "switch");
		var value = vman.parseValue(key);
		var find = false;
		$(o).children().each(function () {
			var case_value = $(this).attr(jstpl.prefix + "case");
			if (case_value != null) {
				if (String(value) !== case_value) {
					$(this).remove();
				} else {
					find = true;
				}
				$(this).removeAttr(jstpl.prefix + "case");
				_removeTag(this);
			}
			if ($(this).attr(jstpl.prefix + "default") != null) {
				if (find) {
					$(this).remove();
				}
				$(this).removeAttr(jstpl.prefix + "default");
				_removeTag(this);
			}
		});
		$(o).removeAttr(jstpl.prefix + "switch");
		_removeTag(o);
	};
	var _assignMap = function (o, map) {
		for(var key in map) {
			$('<option/>')
				.text(map[key])
				.val(key)
				.appendTo($(o))
			;
		}
		$(o).attr(attr_key_mapped, '1');
	};
	var _assignValue = function (o, value) {
		if (o.tagName && (o.tagName == 'INPUT' || o.tagName == 'SELECT')) {
			switch ($(o).attr('type')) {
			case 'radio':
				$(o).attr('checked', $(o).val() === String(value));
				break;
			case 'checkbox':
				if ($.isArray(value)) {
					$(o).attr('checked', $.inArray($(o).val(), value) >= 0);
				} else {
					$(o).attr('checked', $(o).val() === String(value));
				}
				break;
			default:
				$(o).val(value);
			}
		} else {
			$(o).text(value);
		}
		$(o).attr(attr_key_assigned, '1');
	};
	var _procMap = function (i, o) {
		if ($(o).attr(attr_key_mapped) == null) {
			_assignMap(o, vman.parseValue($(o).attr(jstpl.prefix + "map")));
			$(o).removeAttr(jstpl.prefix + "map");
		}
	};
	var _procAssign = function (i, o) {
		if ($(o).attr(attr_key_assigned) == null) {
			_assignValue(o, vman.parseValue($(o).attr(jstpl.prefix + "assign")));
			$(o).removeAttr(jstpl.prefix + "assign");
		}
	};
	var _procAutoAssign = function (i, o) {
		var name = $(o).attr('name');
		if (name == null || name.length == 0) return;
		var typeName = $(o).attr('type');
		if (typeName == 'button' || typeName == 'submit') return;
		if ($(o).attr(attr_key_mapped) == null) {
			if (this.tagName == 'SELECT') {
				if ($(this).attr(jstpl.prefix + "map") == null) {
					var map = vman.parseValue(jstpl.prefixMap + name);
					if (map != null) {
						_assignMap(o, map);
					}
				} else {
					/* in the same way, assign map to <select/> */
					_assignMap(o, vman.parseValue($(o).attr(jstpl.prefix + "map")));
					$(this).removeAttr(jstpl.prefix + "map");
				}
			}
		}
		if ($(this).attr(attr_key_assigned) == null) {
			if ($(this).attr(jstpl.prefix + "assign") == null) {
				var value = vman.parseValue(name);
				if (value != null) {
					_assignValue(o, value);
				}
			}
		}
	};
	var _getObjects = function ($o, search_selector) {
		return $o.find('*').andSelf().filter(search_selector);
	};
	var _getObjectsMap = function ($o, map_func) {
		return $o.find('*').andSelf().map(map_func);
	};
	var _proc = function ($e) {
		_getObjects($e, "[" + jstpl.prefix + "save" + "]").each(_procSave);
		_getObjects($e, "[" + jstpl.prefix + "save-remove" + "]").each(_procSaveRemove);

		_getObjects($e, "[" + jstpl.prefix + "include" + "]").each(_procInclude);

		_getObjects($e, "[" + jstpl.prefix + "for" + "]").each(_procFor);
		_getObjects($e, "[" + jstpl.prefix + "if" + "]").each(_procIf);
		_getObjects($e, "[" + jstpl.prefix + "switch" + "]").each(_procSwitch);

		if (jstpl.attributeAssign) {
			_getObjectsMap($e, _procAttribute);
		}

		if (jstpl.autoAssign) {
			_getObjects($e, "select,input,textarea").each(_procAutoAssign);
		}
		_getObjects($e, "[" + jstpl.prefix + "map" + "]").each(_procMap);
		_getObjects($e, "[" + jstpl.prefix + "assign" + "]").each(_procAssign);
	};
	
	this.proc = function () {
console.log('proc start ' + self.parent);
		_proc(self.$e);
		return $.when.apply(null, this.defereds).done(function () {
console.log('proc end ' + self.parent);
			if (self.parent == null) {
console.log('clean up ' + self.parent);
				_getObjects(self.$e, "[" + attr_key_mapped + "]").removeAttr(attr_key_mapped);
				_getObjects(self.$e, "[" + attr_key_assigned + "]").removeAttr(attr_key_assigned);
			}
		});
	}

};

jstpl.init = function () 
{
	if (arguments.length == 1) {
		if (arguments[0].mode != null) {
			jstpl.mode = arguments[0].mode;
		}
		if (arguments[0].autoAssign != null) {
			jstpl.autoAssign = arguments[0].autoAssign;
		}
		if (arguments[0].attributeAssign != null) {
			jstpl.attributeAssign = arguments[0].attributeAssign;
		}
		if (arguments[0].replaceEval != null) {
			jstpl.replaceEval = arguments[0].replaceEval;
		}
		if (arguments[0].prefixMap != null) {
			jstpl.prefixMap = arguments[0].prefixMap;
		}
		if (arguments[0].includeCache != null) {
			jstpl.includeCache = arguments[0].includeCache;
		}
		if (arguments[0].prefixIncludeCache != null) {
			jstpl.prefixIncludeCache = arguments[0].prefixIncludeCache;
		}
		
	}

	var getFileName = function (url) {
		url = url.substring(url.lastIndexOf("/") + 1, url.length);
		var question = url.lastIndexOf("?");
		if (question >= 0) {
			url = url.substring(0, question);
		}
		return url;
	}
	if (jstpl.mode == null) {
		jstpl.mode = jstpl.MODE_DESIGN;
	}
	switch (jstpl.mode) {
	case jstpl.MODE_DESIGN:
		break;
	case jstpl.MODE_TEST:
		jstpl.loadTestData(decodeURI(getFileName(location.href)));
		break;
	case jstpl.MODE_DEPLOY:
		break;
	}
}

$.fn.extend({
	tmplRender: function() {
		var is_document = (this[0] === document);
		if (is_document) {
			if (jstpl.mode == jstpl.MODE_DESIGN) return;
		}
		var valMan = null;
		var callback = null;
		switch (arguments.length) {
		case 0:
			valMan = new jstpl.ValueManager(jstpl.vars);
			break;
		case 1:
			if ($.isFunction(arguments[0])) {
				valMan = new jstpl.ValueManager(jstpl.vars);
				callback = arguments[0];
			} else {
				valMan = new jstpl.ValueManager(arguments[0]);
			}
			break;
		case 2:
			valMan = new jstpl.ValueManager(arguments[0]);
			callback = arguments[1];
			break;
		default:
		}
		return this.each(function() {
			(function (self, _vman, _callback) {
				new jstpl.TemplateRender(_vman, $(self), null).proc().done(function () {
					if (_callback) {
						_callback.apply(self);
					}
				});
			})(this, valMan, callback);
		});
	}
});