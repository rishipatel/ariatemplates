/**
 * Copyright 2012 Amadeus s.a.s.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @class aria.utils.TemplateTrait Class has common methods used in aria.widget.Templates and aria.html.Template
 */
Aria.classDefinition({
	$classpath : "aria.templates.TemplateTrait",
	$constructor : function () {},
	$prototype : {

		/**
		 * Callback for the module controller load. It is called when the module controller (if any) has been loaded.
		 * @protected
		 */
		_onModuleCtrlLoad : function () {
			var tplcfg = this._tplcfg;
			if (!tplcfg) {
				// the module controller may arrive after the widget has been disposed
				// do nothing in this case
				return;
			}
			if (this._needCreatingModuleCtrl) {
				// initialize the module controller
				var moduleCtrl = this._cfg.moduleCtrl;
				aria.templates.ModuleCtrlFactory.createModuleCtrl(moduleCtrl, {
					fn : this._onTplLoad,
					scope : this,
					args : {
						autoDispose : moduleCtrl.autoDispose
					}
				});
			} else {
				this._onTplLoad({
					moduleCtrl : tplcfg.moduleCtrl
				}, {
					autoDispose : false
				});
			}
		},
		/**
		 * Called when inner template raises its first "Ready Event" event to raise an event to the the parent widget
		 * @private
		 */
		__innerTplReadyCb : function () {
			// moved viewReady here so it's called before the $displayReady of the parent template
			this.subTplCtxt.viewReady(); // view successfully rendered: signal to template through TemplateContext
			this.$raiseEvent("ElementReady");
			this.isDiffered = false;
		},

		/**
		 * It calls the $focusFromParentMethod of the template context associated to the subtemplate. If the subTplCtxt of
		 * the widget has not been set yet, set a listener to the 'ElementReady' event, when the subTplCtxt will have
		 * certainly been defined. In the listener, the callback received as argument is called. The callback is passed as
		 * argument by the focusFirst and _doFocus methods of aria.utils.NavigationManager
		 * @param {Object} cb {aria.core.JsObject.Callback}
		 * @return {Boolean} success/failure of the method
		 */
		focus : function (cb) {
			if (this.subTplCtxt) {
				return this.subTplCtxt.$focusFromParent();
			} else {
				this.$onOnce({
					'ElementReady' : function () {
						var focusSuccess = this.subTplCtxt.$focusFromParent();
						if (focusSuccess == false && cb) {
							this.$callback(cb);
						}
					},
					scope : this
				});
				return true;
			}
		}
	}
});