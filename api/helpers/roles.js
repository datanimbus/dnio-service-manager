let e = {};

function rand(index) {
	const i = Math.pow(10, index - 1);
	const j = Math.pow(10, index) - 1;
	return Math.floor(Math.random() * (j - i + 1)) + i;
}

e.getDefaultRoles = function() {
	const mp = `P` + rand(10);
	const vp = `P` + rand(10);
	const srp = `P` + rand(10);
	return [
		{
			skipReviewRole: true,
			id: srp,
			name: `Skip Review`,
			operations: [
				{
					method: `SKIP_REVIEW`
				},
				{
					method: `POST`
				},
				{
					method: `PUT`
				},
				{
					method: `DELETE`
				},
			],
			description: `This role entitles an authorized user to create, update or delete a record and without any approval`
		},
		{
			manageRole: true,
			id: mp,
			name: `Manage`,
			operations: [
				{
					method: `POST`
				},
				{
					method: `PUT`
				},
				{
					method: `DELETE`
				},
				{
					method: `GET`
				}
			],
			description: `This role entitles an authorized user to create, update or delete a record`
		},
		{
			viewRole: true,
			id: vp,
			name: `View`,
			operations: [
				{
					method: `GET`
				}
			],
			description: `This role entitles an authorized user to view the record`
		}
	];
};
e.getDefaultFields = function (roleIds, definition, fields) {
	if (typeof fields === `string`) {
		fields = JSON.parse(fields);
	}
	let arrDefinition = [];
	if(Array.isArray(definition)) {
		arrDefinition = definition;
	} else {
		Object.keys(definition).forEach(key => {
			let obj = definition[key];
			obj.key = key;
			arrDefinition.push(obj);
		});
	}
	arrDefinition.forEach(def => {
		if (!def.properties) {
			def.properties = {};
		}
		if (!def._id) {
			if (def.type === `Object`) {
				if (!fields[def.key]) {
					fields[def.key] = {};
				}
				e.getDefaultFields(roleIds, def.definition, fields[def.key]);
			} else {
				if (!fields[def.key]) {
					fields[def.key] = {};
				}
				if ([`String`, `Number`, `Boolean`, `Date`, `Array`].indexOf(def.type) > -1) {
					fields[def.key][`_t`] = def.type;
				} else if (def.type) {
					fields[def.key][`_t`] = `String`;
				}
				if (!fields[def.key][`_p`]) {
					fields[def.key][`_p`] = {};
				}
				roleIds.forEach(id => {
					if (!fields[def.key][`_p`][id]) {
						fields[def.key][`_p`][id] = `R`;
					}
				});
			}
		} else {
			if (!fields[def.key]) {
				fields[def.key] = {};
			}
			fields[def.key][`_t`] = `String`;
			if (!fields[def.key][`_p`]) {
				fields[def.key][`_p`] = {};
			}
			roleIds.forEach(id => {
				if (!fields[def.key][`_p`][id]) {
					fields[def.key][`_p`][id] = `R`;
				}
			});
		}
	});
	const keys = Object.keys(fields);
	keys.forEach(key => {
		if (!arrDefinition.find(e => e.key === key)) {
			delete fields[key];
		}
	});
	return fields;
};

module.exports = e;