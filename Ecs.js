var Ecs = function(){

	var idCounter,
		components,
		systems,
		groups,
		entities;

	function Ecs(){
		this.init();
	};

	Ecs.prototype.init = function(){
		idCounter = 0;
		entities = [];
		components = {};
		groups = {};
		systems = [];
	};

	Ecs.prototype.entity = function(){
		var entity = new Entity();
		entities.push(entity);
		return entity;
	};

	Ecs.prototype.system = function(options){
		var system = new System(options);
		systems.push(system);
	};

	Ecs.prototype.component = function(name,fn){
		if(components[name]) throw new Error("Overwriting already existing component: "+name)
		components[name] = fn || function(value){this.value = value;};
	};

	Ecs.prototype.run = function(globalArgs){
		var i;
		var len = systems.length;
		for(i = 0; i < len; i++){
			systems[i].run.call(systems[i],globalArgs);
		}
	};

	Ecs.prototype.runGroup = function(name,globalArgs){
		if(groups[name]){
			var i;
			var len = groups[name].length;
			for(i = 0; i < len; i++){
				groups[name][i].run.call(groups[name][i],globalArgs);
			}
		}
	};

	Ecs.prototype.getEntities = function(){
		return entities;
	};

	function Entity(){
		this.components = {};
		this.id = idCounter++;
	};

	Entity.prototype.add = function(name){
		var args = Array.prototype.slice.call(arguments);
		args.shift();
		this.components[name] = {};
		components[name].apply(this.components[name],args);
		onAddComponent(this);
		return this;
	};

	Entity.prototype.remove = function(name){
		delete this.components[name];
		onRemoveComponent(this);
	};

	function onAddComponent(entity){
		var i;
		var len = systems.length;
		var has;
		for(i = 0; i < len; i++){
			if(systems[i].hasEntity(entity) && systems[i].entityHasNot(entity)){//did we add component that is in "not" list?
				systems[i].removeEntity(entity);
			}
			if(!systems[i].hasEntity(entity) && systems[i].entityHasComponents(entity) && !systems[i].entityHasNot(entity)){//did we add component that suffices to a new system?
				systems[i].addEntity(entity);
			}
		}
	};

	function onRemoveComponent(entity){
		var i;
		var len = systems.length;
		for(i = 0; i < len; i++){
			if(systems[i].hasEntity(entity) && !systems[i].entityHasComponents(entity)){//did we remove component that was needed for this system
				systems[i].removeEntity(entity);
			}
			if(!systems[i].hasEntity(entity) && systems[i].entityHasComponents(entity) && !systems[i].entityHasNot(entity)){//did we remove "not" listed component and suffice to list?
				systems[i].addEntity(entity);
			}
		}
	};

	function System(options){
		var key;
		for(key in options){
			if(options.hasOwnProperty(key)){
				this[key] = options[key];
			}
		}
		// this.components = options.components;
		// this.not = options.not;
		// this.every = options.every;
		// this.onenter = options.onenter;
		// this.onleave = options.onleave;
		// this.onevent = options.onevent;
		// this.on = options.on;
		// this.pre = options.pre;
		//
		if(this.group !== undefined){
			groups[this.group] = groups[this.group]? groups[this.group] : [];
			groups[this.group].push(this);
		}
		this.entities = [];
    if(options.init) options.init.call(this);
	};

	System.prototype.run = function(globalArgs){
		if(this.pre){
			this.pre.apply(this,arguments);
		}
    if(!this.every) return;
    var args;
		var i;
		var len = this.entities.length;
		for(i = 0; i < len; i++){
      args = this.getArguments(this.entities[i]);
      if(globalArgs) args.push(globalArgs);
			this.every.apply(this.entities[i],args);
		}
	};

	System.prototype.getArguments = function(entity){
		if(!this.components) return false;
		var args = [];
		var i;
		var len = this.components.length;
		for(i = 0; i < len; i++){
			args.push(entity.components[this.components[i]]);
		}
		return args;
	};

	System.prototype.hasEntity = function(entity){
		var i;
		var len = this.entities.length;
		for(i = 0; i < len; i++){
			if(this.entities[i].id === entity.id) return true;
		}
		return false;
	};

	System.prototype.removeEntity = function(entity){
		if(this.onleave){
			this.onleave.apply(entity,this.getArguments(entity));
		}
		var i;
		var len = this.entities.length;
		for(i = 0; i < len; i++){
			if(this.entities[i].id === entity.id){
				this.entities.splice(i,1);
				return true;
			}
		}
		return false;
	};

	System.prototype.addEntity = function(entity){
		this.entities.push(entity);
		if(this.onenter){
			this.onenter.apply(entity,this.getArguments(entity));
		}
	};

	System.prototype.entityHasComponents = function(entity){
		if(!this.components) return true;
		var i;
		var len = this.components.length;
		for(i = 0; i < len; i++){
			if(!entity.components[this.components[i]]){
				return false;
			}
		}
		return true;
	};

	System.prototype.entityHasNot = function(entity){
		if(!this.not) return false;
		var i;
		var len = this.not.length;
		for(i = 0; i < len; i++){
			if(entity.components[this.not[i]]){
				return true;
			}
		}
		return false;
	};

	System.prototype.iterate = function (cb) {
		var args;
		var i;
		var len = this.entities.length;
		for(i = 0; i < len; i++){
			args = this.getArguments(this.entities[i]);
			cb.apply(this.entities[i],args);
		}
	};

	System.prototype.emit = function () {
		var name = arguments[0];
		var args = Array.prototype.slice.call(arguments);
		args.shift();
		for (var i = 0; i < systems.length; i++) {
			if(systems[i].on && systems[i].onevent){
				for (var j = 0; j < systems[i].on.length; j++) {
					if(systems[i].on[j] === name){
						systems[i].onevent.apply(systems[i],args);
					}
				}
			}
		}
	};

	return new Ecs();
};
