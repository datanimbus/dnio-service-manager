module.exports = [
	{
		'name': `Geojson`,
		'definition': {
			'type': `Object`,
			'definition': {
				'geometry': {
					'type': `Object`,
					'definition': {
						'type': {
							'type': `String`,
							'enum': [`Point`]
						},
						'coordinates': {
							'type': `Array`,
							'definition': {
								'_self': {
									'type': `Number`
								}
							}
						}
					}
				},
				'formattedAddress': {
					'type': `String`
				},
				'town': {
					'type': `String`
				},
				'district': {
					'type': `String`
				},
				'state': {
					'type': `String`
				},
				'country': {
					'type': `String`
				},
				'pincode': {
					'type': `String`
				},
				'userInput': {
					'type': `String`
				}
			}
		}
	},
	{
		'name': `File`,
		'definition': {
			'type': `Object`,
			'definition': {
				'_id': {
					'type': `String`
				},
				'filename': {
					'type': `String`
				},
				'contentType': {
					'type': `String`
				},
				'length': {
					'type': `Number`
				},
				'chunkSize': {
					'type': `Number`
				},
				'uploadDate': {
					'type': `Date`
				},
				'md5': {
					'type': `String`
				},
				'metadata': {
					'type': `Object`,
					'definition': {
						'filename': {
							'type': `String`
						}
					}
				}
			}
		}
	}, {
		'name': `Relation`,
		'definition': {
			'type': `Object`,
			'definition': {
				'_id': {
					'type': `String`,
					'properties': {
						'name': `_id`,
						'_typeChanged': `String`
					}
				},
				'_href': {
					'type': `String`,
					'properties': {
						'name': `_href`,
						'_typeChanged': `String`
					}
				}
			}
		}
	},
	{
		'name': `User`,
		'definition': {
			'type': `User`,
			'definition': {
				'_id': {
					'type': `String`,
					'properties': {
						'name': `_id`,
					}
				}
			}
		}
	}, {
		'name': `SecureText`,
		'definition': {
			'type': `Object`,
			'definition': {
				'value': {
					'type': `String`,
					'properties': {
						'name': `value`,
						'_typeChanged': `String`
					}
				},
				'checksum': {
					'type': `String`,
					'properties': {
						'name': `checksum`,
						'_typeChanged': `String`
					}
				}
			}
		}
	}

];