var a = {
	name: `product`,
	collectionName: `product`,
	description: `Product service definition`,
	port: 10017,
	api: `product`,
	version: `1.0`,
	definition: {
		_id: {
			'type': `String`,
			'prefix': `PR`,
			'counter': 10000
		},
		bankDetails: {
			type: `Object`,
			definition: {
				ifscCode: {
					type: `String`
				}
			}
		},
		addresses: {
			type: `Object`,
			properties: {
				'required': true
			},
			definition: {
				'ifsc_code': {
					'type': `String`,
					'properties': {
						'enum': [`value1`, `value2`]
					}
				},
				'bank_name': {
					'type': `String`,
					'properties': {
						'unique': true
					}
				},
				'branch_address': {
					'type': `String`,
					'properties': {
						'required': true
					}
				},
				'complexObject': {
					'type': `Object`,
					'definition': {
						'field1': {
							'type': `String`,
							'properties': {
								'required': true
							}
						},
						'field2': {
							'type': `Number`,
							'properties': {
								'enum': [1, 2, 3, 4]
							}
						}
					},
					'properties': {
						'required': true
					}
				},
				'complexObjectArray': {
					'type': `Array`,
					'definition': {
						'_self': {
							'type': `Object`,
							'definition': {
								'complexObjectArrayfield1': {
									'type': `String`,
									'properties': {
										'required': true
									}
								},
								'complexObjectArrayfield2': {
									'type': `Number`,
									'properties': {
										'enum': [1, 2, 3, 4]
									}
								}
							}
						},
						'properties': {
							'required': true
						}
					},
					'properties': {
						'required': true
					}
				},
				'simpleArray': {
					'type': `Array`,
					'definition': {
						'_self': {
							'type': `String`,
							'properties': {
								'required': true
							}
						}
					},
					'properties': {
						'required': true
					}
				},
				'ArrayArrayString': {
					'type': `Array`,
					'properties': {
						'required': true
					},
					'definition': {
						'_self': {
							'type': `Array`,
							'definition': {
								'_self': {
									'type': `String`,
									'properties': {
										'required': true
									}
								}
							},
							'properties': {
								'required': true
							}
						}
					}
				},
				'ArrayArrayObject': {
					'type': `Array`,
					'properties': {
						'required': true
					},
					'definition': {
						'_self': {
							'type': `Array`,
							'definition': {
								'_self': {
									'type': `Object`,
									'definition': {
										'fieldOb1': {
											'type': `String`,
											'properties': {
												'required': true
											}
										},
										'fieldOb2': {
											'type': `Number`,
											'properties': {
												'enum': [1, 2, 3, 4]
											}
										}
									},
									'properties': {
										'required': true
									}
								},
								'properties': {
									'required': true
								}

							}
						}
					}
				}
			}
		}
	}
};
module.exports = a;