window.Fixtures || (window.Fixtures = {});

Fixtures.RESPONSE_FIELD = {
  id: 1,
  label: 'Name',
  field_type: 'text'
};

Fixtures.KITCHEN_SINK_FORM = [
  {
    id: 35,
    form_id: 5,
    label: "Text",
    field_options: {},
    required: true,
    blind: true,
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
      description: "How would you complete this project?",
      minlength: "10"
    },
    required: false,
    blind: false,
    admin_only: true,
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
  KITCHEN_SINK_REQ: function(){
    return {
      project_id: 1,
      response_fields: _.map(Fixtures.KITCHEN_SINK_FORM, function(rf){
        return _.extend({}, rf, { required: true });
      }),
      response: {
        id: 'xxx',
        responses: {}
      }
    };
  },
  SIZES: function() {
    return {
      project_id: 1,
      response_fields: [
        {
          id: 1,
          form_id: 5,
          label: "Text (small)",
          field_options: {
            size: 'small'
          },
          required: true,
          blind: true,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "text",
          cid: null
        },
        {
          id: 2,
          form_id: 5,
          label: "Text (medium)",
          field_options: {
            size: 'medium'
          },
          required: true,
          blind: true,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "text",
          cid: null
        },
        {
          id: 3,
          form_id: 5,
          label: "Text (large)",
          field_options: {
            size: 'large'
          },
          required: true,
          blind: true,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "text",
          cid: null
        },
        {
          id: 4,
          form_id: 5,
          label: "paragraph (small)",
          field_options: {
            size: 'small'
          },
          required: true,
          blind: true,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "paragraph",
          cid: null
        },
        {
          id: 5,
          form_id: 5,
          label: "paragraph (medium)",
          field_options: {
            size: 'medium'
          },
          required: true,
          blind: true,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "paragraph",
          cid: null
        },
        {
          id: 6,
          form_id: 5,
          label: "paragraph (large)",
          field_options: {
            size: 'large'
          },
          required: true,
          blind: true,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "paragraph",
          cid: null
        },
        {
          id: 7,
          form_id: 5,
          label: "block_of_text (small)",
          field_options: {
            size: 'small',
            description: 'i am a block of text, yo'
          },
          required: true,
          blind: true,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "block_of_text",
          cid: null
        },
        {
          id: 8,
          form_id: 5,
          label: "block_of_text (medium)",
          field_options: {
            size: 'medium',
            description: 'i am a block of text, yo'
          },
          required: true,
          blind: true,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "block_of_text",
          cid: null
        },
        {
          id: 9,
          form_id: 5,
          label: "block_of_text (large)",
          field_options: {
            size: 'large',
            description: 'i am a block of text, yo'
          },
          required: true,
          blind: true,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "block_of_text",
          cid: null
        },
        {
          id: 10,
          form_id: 5,
          label: "section_break (small)",
          field_options: {
            size: 'small',
            description: 'i am a section break, yo'
          },
          required: true,
          blind: true,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "section_break",
          cid: null
        },
        {
          id: 11,
          form_id: 5,
          label: "section_break (medium)",
          field_options: {
            size: 'medium',
            description: 'i am a section break, yo'
          },
          required: true,
          blind: true,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "section_break",
          cid: null
        },
        {
          id: 12,
          form_id: 5,
          label: "section_break (large)",
          field_options: {
            size: 'large',
            description: 'i am a section break, yo'
          },
          required: true,
          blind: true,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "section_break",
          cid: null
        }
      ],
      response: {
        id: 'xxx',
        responses: {}
      }
    };
  },
  SHORT: function() {
    return {
      project_id: 1,
      response_fields: [
        {
          id: 34,
          form_id: 5,
          label: "",
          field_options: {},
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "identification",
          cid: null
        }, {
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
      ],
      response: {
        id: 'xxx',
        responses: {}
      },
      afterSubmit: {
        method: 'page',
        html: 'You did it!'
      }
    };
  },
  CONDITIONAL: function() {
    return {
      project_id: 1,
      response_fields: [
        {
          id: 35,
          form_id: 5,
          label: "Do you like conditional form fields?",
          field_options: {
            options: [
              {
                label: 'Yes',
                checked: true
              }, {
                label: 'No',
                checked: false
              }
            ]
          },
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "dropdown",
          cid: null
        }, {
          id: 36,
          form_id: 5,
          label: "Dang, that sucks.",
          field_options: {
            size: 'large',
            conditions: [
              {
                action: 'show',
                response_field_id: 35,
                method: 'eq',
                value: 'No'
              }
            ]
          },
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "section_break",
          cid: null
        }, {
          id: 37,
          form_id: 5,
          label: "What's your email address?",
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "email",
          cid: null
        }, {
          id: 38,
          form_id: 5,
          label: "What are the nuclear launch codes?",
          field_options: {
            conditions: [
              {
                action: 'show',
                response_field_id: 37,
                method: 'contains',
                value: 'whitehouse'
              }
            ]
          },
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "text",
          cid: null
        }, {
          id: 39,
          form_id: 5,
          label: "What's the most boring part of the job?",
          field_options: {
            conditions: [
              {
                action: 'hide',
                response_field_id: 37,
                method: 'contains',
                value: 'whitehouse'
              }
            ]
          },
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "text",
          cid: null
        }, {
          id: 40,
          form_id: 5,
          label: "Guess a number...",
          required: false,
          blind: false,
          admin_only: false,
          field_options: {
            min: 1,
            max: 10
          },
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "number",
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
          id: 41,
          form_id: 5,
          label: "Why do you like big numbers?",
          field_options: {
            conditions: [
              {
                action: 'show',
                response_field_id: 40,
                method: 'gt',
                value: '5'
              }
            ]
          },
          required: true,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "text",
          cid: null
        }, {
          id: 101,
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
          id: 42,
          form_id: 5,
          label: "Guess a price...",
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "price",
          cid: null
        }, {
          id: 43,
          form_id: 5,
          label: "Why so expensive?",
          field_options: {
            conditions: [
              {
                action: 'show',
                response_field_id: 42,
                method: 'gt',
                value: '5.00'
              }
            ]
          },
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "text",
          cid: null
        }
      ],
      response: {
        id: 'xxx',
        responses: {}
      }
    };
  },
  CONDITIONAL_TWO: function() {
    return {
      project_id: 1,
      response_fields: [
        {
          id: 35,
          form_id: 5,
          label: "Essay 1",
          field_options: {
            min_max_length_units: 'words',
            maxlength: 100
          },
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "paragraph",
          cid: null
        }, {
          id: 36,
          form_id: 5,
          label: "Essay 2",
          field_options: {
            min_max_length_units: 'characters',
            maxlength: 100
          },
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "paragraph",
          cid: null
        }, {
          id: 37,
          form_id: 5,
          label: "Please elaborate... (lt 10 words)",
          field_options: {
            conditions: [
              {
                action: 'show',
                response_field_id: 35,
                method: 'shorter',
                value: '10'
              }
            ]
          },
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "text",
          cid: null
        }, {
          id: 38,
          form_id: 5,
          label: "No more! (gt 10 characters)",
          field_options: {
            conditions: [
              {
                action: 'show',
                response_field_id: 36,
                method: 'longer',
                value: '10'
              }
            ]
          },
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "text",
          cid: null
        }
      ],
      response: {
        id: 'xxx',
        responses: {}
      }
    };
  },
  CONDITIONAL_THREE: function() {
    return {
      project_id: 1,
      response_fields: [
        {
          id: 35,
          form_id: 5,
          label: "Question 1",
          field_options: {
            options: [
              {
                label: 'Yes',
                checked: false
              }, {
                label: 'No',
                checked: false
              }
            ]
          },
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "checkboxes",
          cid: null
        }, {
          id: 36,
          form_id: 5,
          label: "Question 2",
          field_options: {
            options: [
              {
                label: 'Yes',
                checked: false
              }, {
                label: 'No',
                checked: false
              }
            ]
          },
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "checkboxes",
          cid: null
        }, {
          id: 37,
          form_id: 5,
          label: "Why do you like the word 'yes'?",
          field_options: {
            conditions: [
              {
                action: 'show',
                response_field_id: 35,
                method: 'contains',
                value: 'Yes'
              }, {
                action: 'show',
                response_field_id: 36,
                method: 'contains',
                value: 'Yes'
              }
            ]
          },
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "text",
          cid: null
        }
      ],
      response: {
        id: 'xxx',
        responses: {}
      }
    };
  },
  BLANK: function() {
    return {
      project_id: 1,
      response_fields: [],
      response: {
        id: 'xxx',
        responses: {}
      }
    };
  },
  BLANK_IDENTIFIED: function() {
    return {
      project_id: 1,
      response_fields: [
        {
          id: 34,
          form_id: 5,
          label: "",
          field_options: {},
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "identification",
          cid: null
        }
      ],
      response: {
        id: 'xxx',
        responses: {}
      }
    };
  },
  FILE: function() {
    return {
      project_id: 1,
      response_fields: [
        {
          id: 35,
          form_id: 5,
          label: "Text",
          field_options: {
            file_types: 'images'
          },
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "file",
          cid: null
        }
      ],
      response: {
        id: 'xxx',
        responses: {}
      }
    };
  },
  SD: function() {
    return {
      project_id: 1
    };
  }
};

Fixtures.FormRendererOptions.KITCHEN_IMMEDIATE_VALIDATIONS = function(){
  return $.extend(
    Fixtures.FormRendererOptions.KITCHEN_SINK_REQ(),
    { validateImmediately: true }
  );
}

Fixtures.FormRendererOptions.PAGE_STATE = function(){
  return $.extend(
    Fixtures.FormRendererOptions.CONDITIONAL(),
    { plugins: _.union(FormRenderer.prototype.defaults.plugins, ['PageState']) }
  );
}
