(function($){
	//获取浏览器前缀
	//实现：判断某个元素的css样式中是否存在transition属性
	//参数：dom元素 创建的一个自定义的element
	//返回值：boolean，有则返回浏览器样式前缀，否则返回false
	//私有方法
	var _prefix = (function(temp){
		var aPrefix = ["webkit","Moz","o","ms"],
			props = "";
		for (var i in aPrefix) {
			props = aPrefix[i] + "Transition";
			if (temp.style[props] !== undefined) {
				return "-" + aPrefix[i].toLowerCase() + "-";
			}
		}
		return false;
	})(document.createElement(PageSwitch));

	//定义PageSwitch对象，是一个自执行函数
	var PageSwitch = (function(){
		//定义与对象名相同的方法名
		//element为jQuery对象，options为配置参数
		function PageSwitch(element, options){
			//合并参数（把用户自定义的参数合并到默认配置中），借助于jQuery的extend方法。定义一个settings存放配置参数。第一个参数是true，因为这里用到深拷贝，第二个参数是组件的默认配置,options||{}这是在设置默认值，一个空的对象
			this.settings = $.extend(true, $.fn.PageSwitch.defaults, options||{});
			this.element = element;//存放element的值
			this.init();//初始化插件
		}

		//初始化插件，挂在原型上的，so对象的实例可以访问到这个方法
		//如何让插件实现调用呢，在插件里面调用
		//这里面定义的方法可以在插件的外面通过$('div').PageSwitch('init');的方式实现调用
		//有下划线的是私有方法
		PageSwitch.prototype = {
			/*初始化插件，初始化dom结构，布局，分页及绑定事件*/
			init : function(){//init是公共方法
				var me = this;//this指的是PageSwitch对象，为了不混淆而赋给me
				//初始化dom结构
				me.selectors = me.settings.selectors;
				me.sections = me.element.find(me.selectors.sections);
				me.section = me.sections.find(me.selectors.section);
				//页面滑动的方向
				me.direction = me.settings.direction == "vertical" ? true : false;
				me.pagesCount = me.pagesCount();
				me.index = (me.settings.index >= 0 && me.settings.index < me.pagesCount) ? me.settings.index : 0;

				me.canScroll = true;//快速滚动滑轮时，只滚动一屏
				//横屏布局
				if(!me.direction){
					me._initLayout();
				}
				//进行分页
				if(me.settings.pagination){
					me._initPaging();
				}
				//绑定事件
				me._initEvent();
			},
			//获取滑动页面数量，即section的数量
			pagesCount : function(){
				return this.section.length;
			},
			//获取滑动的宽度（横屏滑动）或高度（竖屏滑动）
			switchLength : function(){
				return this.direction ? this.element.height() : this.element.width();
			},
			//向前滑动即上一页
			prev : function(){
				var me = this;
				if(me.index > 0){
					me.index--;
				}else if(me.settings.loop){
					me.index = me.pagesCount - 1;
				}
				me._scrollPage();
			},
			//向后滑动即下一页
			next : function(){
				var me = this;
				
				if(me.index < me.pagesCount - 1){
					me.index++;
				}else if(me.settings.loop){
					me.index = 0;
				}
				me._scrollPage();
			},
			//主要针对横屏情况进行页面布局
			_initLayout : function(){
				var me = this;
				var width = (me.pagesCount * 100) + "%",//sections的宽度
					cellWidth = (100 / me.pagesCount).toFixed(2) + "%";//section的宽度，保留两位小数
				me.sections.width(width);
				me.section.width(cellWidth).css('float', 'left');

			},
			//实现分页的dom结构及css样式
			_initPaging : function(){
				var me = this,
					pagesClass = me.selectors.page.substring(1);//去掉“.pages”前面的点
				me.activeClass = me.selectors.active.substring(1);
				var pageHtml = "<ul class=" + pagesClass + ">";
				for (var i = 0; i < me.pagesCount; i++) {
					pageHtml += "<li><span class='hover-text'>" + "page" + (i+1) + "</span></li>";
				}
				pageHtml += "</ul>";
				me.element.append(pageHtml);
				//定义为局部变量，定义在对象下，因为在滑动动画下要对pageItem进行操作
				var pages = me.element.find(me.selectors.page);
				me.pageItem = pages.find('li');
				me.pageItem.eq(me.index).addClass(me.activeClass);
				//根据不同的方向加不同的class
				if (me.direction) {
					pages.addClass('vertical');
				}else{
					pages.addClass('horizontal');
				}
			},
			//初始化插件事件
			_initEvent : function(){
				//分页事件，事件委托on方法
				var me = this;
				//分页的click事件
				me.pageItem.on('click', function(e) {
					me.index = $(this).index();
					
					me._scrollPage();

				});
				//鼠标的滚动事件
				me.element.on('mousewheel DOMMouseScroll', function(e) {
					e.preventDefault();
					if (me.canScroll) {
						var delta = e.originalEvent.wheelDelta || e.originalEvent.detail;//火狐单独考虑，因为有不同，是后一个
						if(delta > 0 && (me.index && !me.settings.loop || me.settings.loop)){
							me.prev();
						}else if(delta < 0 && (me.index < (me.pagesCount - 1) && !me.settings.loop || me.settings.loop)){
							me.next();
						}
					}
				});
				//键盘事件
				if (me.settings.keyboard) {
					$(window).on('keydown', function(e) {
						var keyCode = e.keyCode;
						if(keyCode == 37 || keyCode == 38){
							me.prev();
						}else if (keyCode == 39 || keyCode == 40) {
							me.next();
						}
					});
				}

				$(window).resize(function(event) {
					var currentLength = me.switchLength(),
						offset = me.settings.direction ? me.section.eq(me.index).offset().top : me.section.eq(me.index).offset().left;//当前界面相对于文档的坐标值
						//如果offset值大于currentLength的一半且当前index小于pagesCount - 1的话，me.index就++
						if (Math.abs(offset) > currentLength/2 && me.index < me.pagesCount - 1) {
							me.index++;
						}
						if (me.index) {
							me._scrollPage();
						}
				});

				me.sections.on('transitionend webkitTransitionEnd oTransitionEnd otransitionend', function(event) {
					me.canScroll = true;
					if (me.settings.callback && $.type(me.settings.callback) == "function") {
						me.settings.callback();
					}
				});
			},
			//滑动动画
			_scrollPage : function(){
				var me = this,
					dest = me.section.eq(me.index).position();//坐标值
				if(!dest) return;

				me.canScroll = false;
				if (_prefix) {//即支持transition属性
					me.sections.css(_prefix + "transition", "all " + me.settings.duration + "ms " + me.settings.easing);
					var cHeight = $(window).height();
					var cWidth = $(window).width();
					var translate = me.direction ? "translateY(-"+cHeight*me.index+"px)" : "translateX(-"+cWidth*me.index+"px)";
					me.sections.css(_prefix + 'transform', translate);
				}else {
					//不支持transition属性，则使用animate方法
					var animateCss = me.direction ? {top : -dest.top} : {left : -dest.left};
					me.sections.animate(animateCss, me.settings.duration, function(){
						//这里的方法和transitionend方法实现的是一样的
						me.canScroll = true;
						if (me.settings.callback && $.type(me.settings.callback) == "function") {
							me.settings.callback();
						}
					});
				}

				me.section.eq(me.index).addClass("active").siblings().removeClass("active");

				//分页的样式
				if (me.settings.pagination) {
					me.pageItem.eq(me.index).addClass(me.activeClass).siblings('li').removeClass(me.activeClass);
				}
			}
		};

		return PageSwitch;
	})();

	//在jQuery的原型下挂载我们的方法
	//把用户自定义的参数传进来，用形参options
	$.fn.PageSwitch = function(options){
		return this.each(function() {
			var me = $(this),
				instance = me.data('PageSwitch');//存放插件的实例
			if(!instance){//如果实例为空就创建一个实例赋给它
				instance = new PageSwitch(me, options);
				me.data('PageSwitch', instance);//把实例存放在data上面
			}
			//判断用户传递的options参数的类型，如果是字符串就实现方法的调用  这是为了实现能够在外面调用init那些定义在原型上的方法，init是我们的公共方法
			if ($.type(options) === "string") {
				return instance[options]();//这样我们在插件的外部就可以通过配置变量实现方法的调用，
				//如$('div').PageSwitch('init');初始化插件
			}
			
		});	
	}

	//定义配置参数，以便用户配置不同的参数来自定义插件
	$.fn.PageSwitch.defaults = {
		selectors : {
			sections : ".sections",
			section : ".section",
			page : ".pages",
			active : ".active"
		},
		index : 0,
		easing : "ease",
		duration : 500,
		loop : false,
		pagination : true,
		keyboard : true,
		direction : "vertical",
		callback : ""//在transitionend中调用
	}
})(jQuery);