(function() {
  window.Fixtures || (window.Fixtures = {});

  Fixtures.Validation = {
    MIN_MAX_LENGTH_CHARACTERS: {
      valid: ['Boooo', '   Boooo        ', ' Boooooooo  ', ';oooo:'],
      invalid: ['Boo', 'Boooooooooooooooooooo']
    },
    MIN_MAX_LENGTH_WORDS: {
      valid: ['Boo hoo   ', ' Boo hoo hoo'],
      invalid: [' Boo ', 'Boo hoo  hoo hoo   ']
    },
    MIN_MAX: {
      valid: ['5.01', '10.00'],
      invalid: ['1', '4.99999', '10.9']
    },
    INTEGER: {
      valid: ['1'],
      invalid: ['1.2', '1.0']
    },
    PRICE: {
      valid: [
        {
          'cents': '1',
          'dollars': ''
        }, {
          'cents': '',
          'dollars': '1'
        }, {
          'cents': '',
          'dollars': '0'
        }, {
          'cents': '0',
          'dollars': ''
        }, {
          'cents': '01',
          'dollars': '2,000'
        }, {
          'cents': '01',
          'dollars': '2,000,000'
        }
      ],
      invalid: [
        {
          'dollars': 'a'
        }, {
          'dollars': '1a'
        }, {
          'cents': 'a'
        }, {
          'cents': '1a'
        }, {
          'dollars': '3a',
          'cents': '1'
        }, {
          'dollars': '3',
          'cents': '100z'
        }, {
          'dollars': '3-000',
          'cents': '0'
        }
      ]
    },
    DATE: {
      valid: [
        {
          'month': '2',
          'day': '3',
          'year': '2011'
        }
      ],
      invalid: [
        {
          'month': '2'
        }, {
          'month': '2',
          'day': '3'
        }
      ]
    },
    TIME: {
      valid: [
        {
          'hours': '1',
          'minutes': '1'
        }
      ],
      invalid: [
        {
          'hours': '0'
        }, {
          'hours': '0',
          'minutes': '1'
        }
      ]
    },
    EMAIL: {
      valid: ['a@a'],
      invalid: ['a']
    },
    NUMBER: {
      invalid: ['a', 'a123', '123+'],
      valid: ['123', '1,23', '1.23', '1-23', '+15107671234']
    }
  };

  Fixtures.RESPONSE_FIELD = {
    id: 1,
    label: 'Name',
    field_type: 'text'
  };

  Fixtures.SHORT_FORM = [
    {
      id: 35,
      form_id: 5,
      label: "Text",
      field_options: {},
      required: false,
      blind: false,
      admin_only: false,
      created_at: "2014-08-22T20:50:37.152Z",
      updated_at: "2014-08-22T20:50:37.152Z",
      field_type: "text",
      cid: null
    }
  ];

  Fixtures.KITCHEN_SINK_FORM = [
    {
      id: 35,
      form_id: 5,
      label: "Text",
      field_options: {},
      required: true,
      blind: false,
      admin_only: false,
      created_at: "2014-08-22T20:50:37.152Z",
      updated_at: "2014-08-22T20:50:37.152Z",
      field_type: "text",
      cid: null
    }, {
      id: 36,
      form_id: 5,
      label: "Paragraph",
      field_options: {
        size: "large",
        required: true,
        description: "How would you complete this project?"
      },
      required: false,
      blind: false,
      admin_only: false,
      created_at: "2014-08-22T20:50:37.169Z",
      updated_at: "2014-08-22T20:50:37.169Z",
      field_type: "paragraph",
      cid: null
    }, {
      id: 37,
      form_id: 5,
      label: "Checkboxes",
      field_options: {
        options: [
          {
            checked: "false",
            label: "Choice #1"
          }, {
            checked: "false",
            label: "Choice #2"
          }
        ],
        required: true
      },
      required: false,
      blind: false,
      admin_only: false,
      created_at: "2014-08-22T20:50:37.187Z",
      updated_at: "2014-08-22T20:50:37.187Z",
      field_type: "checkboxes",
      cid: null
    }, {
      id: 38,
      form_id: 5,
      label: "THE SECTION!",
      required: false,
      blind: false,
      admin_only: false,
      created_at: "2014-08-22T20:50:37.217Z",
      updated_at: "2014-08-22T20:50:37.217Z",
      field_type: "section_break",
      cid: null
    }, {
      id: 100,
      form_id: 5,
      label: "",
      field_options: {},
      required: false,
      blind: false,
      admin_only: false,
      created_at: "2014-08-22T20:50:37.217Z",
      updated_at: "2014-08-22T20:50:37.217Z",
      field_type: "page_break",
      cid: null
    }, {
      id: 101,
      form_id: 5,
      label: "New page",
      field_options: {
        description: "hey hey hey."
      },
      required: false,
      blind: false,
      admin_only: false,
      created_at: "2014-08-22T20:50:37.217Z",
      updated_at: "2014-08-22T20:50:37.217Z",
      field_type: "section_break",
      cid: null
    }, {
      id: 102,
      form_id: 5,
      label: "",
      field_options: {
        description: "Howdyhowdyhowdy"
      },
      required: false,
      blind: false,
      admin_only: false,
      created_at: "2014-08-22T20:50:37.217Z",
      updated_at: "2014-08-22T20:50:37.217Z",
      field_type: "block_of_text",
      cid: null
    }, {
      id: 39,
      form_id: 5,
      label: "Radio",
      field_options: {
        options: [
          {
            checked: "false",
            label: "Choice #1"
          }, {
            checked: "false",
            label: "Choice #2"
          }
        ],
        required: true
      },
      required: false,
      blind: false,
      admin_only: false,
      created_at: "2014-08-22T20:50:37.235Z",
      updated_at: "2014-08-22T20:50:37.235Z",
      field_type: "radio",
      cid: null
    }, {
      id: 40,
      form_id: 5,
      label: "Dropdown",
      field_options: {
        options: [
          {
            checked: "false",
            label: "Choice #1"
          }, {
            checked: "false",
            label: "Choice #2"
          }
        ],
        required: true,
        include_blank_option: true
      },
      required: false,
      blind: false,
      admin_only: false,
      created_at: "2014-08-22T20:50:37.259Z",
      updated_at: "2014-08-22T20:50:37.259Z",
      field_type: "dropdown",
      cid: null
    }, {
      id: 41,
      form_id: 5,
      label: "Price",
      field_options: {
        required: true
      },
      required: false,
      blind: false,
      admin_only: false,
      created_at: "2014-08-22T20:50:37.284Z",
      updated_at: "2014-08-22T20:50:37.284Z",
      field_type: "price",
      cid: null
    }, {
      id: 42,
      form_id: 5,
      label: "Number",
      field_options: {
        required: true,
        units: "things"
      },
      required: false,
      blind: false,
      admin_only: false,
      created_at: "2014-08-22T20:50:37.300Z",
      updated_at: "2014-08-22T20:50:37.300Z",
      field_type: "number",
      cid: null
    }, {
      id: 43,
      form_id: 5,
      label: "Date",
      field_options: {
        required: true
      },
      required: false,
      blind: false,
      admin_only: false,
      created_at: "2014-08-22T20:50:37.319Z",
      updated_at: "2014-08-22T20:50:37.319Z",
      field_type: "date",
      cid: null
    }, {
      id: 44,
      form_id: 5,
      label: "Time",
      field_options: {
        required: true
      },
      required: false,
      blind: false,
      admin_only: false,
      created_at: "2014-08-22T20:50:37.336Z",
      updated_at: "2014-08-22T20:50:37.336Z",
      field_type: "time",
      cid: null
    }, {
      id: 45,
      form_id: 5,
      label: "Website",
      field_options: {
        required: true
      },
      required: false,
      blind: false,
      admin_only: false,
      created_at: "2014-08-22T20:50:37.456Z",
      updated_at: "2014-08-22T20:50:37.456Z",
      field_type: "website",
      cid: null
    }, {
      id: 46,
      form_id: 5,
      label: "File",
      field_options: {
        required: true
      },
      required: false,
      blind: false,
      admin_only: false,
      created_at: "2014-08-22T20:50:37.473Z",
      updated_at: "2014-08-22T20:50:37.473Z",
      field_type: "file",
      cid: null
    }, {
      id: 47,
      form_id: 5,
      label: "Email",
      field_options: {
        required: true
      },
      required: false,
      blind: false,
      admin_only: false,
      created_at: "2014-08-22T20:50:37.491Z",
      updated_at: "2014-08-22T20:50:37.491Z",
      field_type: "email",
      cid: null
    }, {
      id: 48,
      form_id: 5,
      label: "Address",
      field_options: {
        required: true
      },
      required: false,
      blind: false,
      admin_only: false,
      created_at: "2014-08-22T20:50:37.508Z",
      updated_at: "2014-08-22T20:50:37.508Z",
      field_type: "address",
      cid: null
    }, {
      id: 49,
      form_id: 5,
      label: "Table",
      field_options: {
        columns: [
          {
            label: "column one"
          }, {
            label: "column two"
          }
        ],
        minrows: "2"
      },
      required: false,
      blind: false,
      admin_only: false,
      created_at: "2014-08-22T20:50:37.524Z",
      updated_at: "2014-08-22T20:50:37.524Z",
      field_type: "table",
      cid: null
    }, {
      id: 50,
      form_id: 5,
      label: "MapMarker",
      field_options: {},
      required: false,
      blind: false,
      admin_only: false,
      created_at: "2014-08-22T20:50:37.547Z",
      updated_at: "2014-08-22T20:50:37.547Z",
      field_type: "map_marker",
      cid: null
    }
  ];

  Fixtures.FormRendererOptions = {
    LOADED: function() {
      return {
        project_id: 1,
        response_fields: [],
        response: {
          id: 'xxx',
          responses: {}
        }
      };
    },
    RESPONSE_LOADED: function() {
      return {
        project_id: 1,
        response: {
          responses: {
            '1': 'hey'
          }
        }
      };
    },
    PROJECT_LOADED: function() {
      return {
        project_id: 1,
        response_fields: [_.clone(Fixtures.RESPONSE_FIELD)],
        response: {
          id: 'xxx'
        }
      };
    },
    NOT_LOADED: function() {
      return {
        project_id: 1,
        response: {
          id: 'xxx'
        }
      };
    },
    KITCHEN_SINK: function() {
      return {
        project_id: 1,
        response_fields: Fixtures.KITCHEN_SINK_FORM,
        response: {
          id: 'xxx',
          responses: {}
        }
      };
    },
    SHORT: function() {
      return {
        project_id: 1,
        response_fields: Fixtures.SHORT_FORM,
        response: {
          id: 'xxx',
          responses: {}
        }
      };
    }
  };

}).call(this);
