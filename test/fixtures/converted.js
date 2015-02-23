Fixtures.Validation = {
  "MIN_MAX_LENGTH_CHARACTERS": {
    "valid": ["Boooo", "   Boooo        ", " Boooooooo  ", ";oooo:"],
    "invalid": ["Boo", "Boooooooooooooooooooo"]
  },
  "MIN_MAX_LENGTH_WORDS": {
    "valid": ["Boo hoo   ", " Boo hoo hoo"],
    "invalid": [" Boo ", "Boo hoo  hoo hoo   "]
  },
  "MIN_MAX": {
    "valid": ["5.01", "10.00"],
    "invalid": ["1", "4.99999", "10.9"]
  },
  "INTEGER": {
    "valid": ["1"],
    "invalid": ["1.2", "1.0"]
  },
  "PRICE": {
    "valid": [{
      "cents": "1",
      "dollars": ""
    }, {
      "cents": "",
      "dollars": "1"
    }, {
      "cents": "",
      "dollars": "0"
    }, {
      "cents": "0",
      "dollars": ""
    }, {
      "cents": "01",
      "dollars": "2,000"
    }, {
      "cents": "01",
      "dollars": "2,000,000"
    }],
    "invalid": [{
      "dollars": "a"
    }, {
      "dollars": "1a"
    }, {
      "cents": "a"
    }, {
      "cents": "1a"
    }, {
      "dollars": "3a",
      "cents": "1"
    }, {
      "dollars": "3",
      "cents": "100z"
    }, {
      "dollars": "3-000",
      "cents": "0"
    }]
  },
  "DATE": {
    "valid": [{
      "month": "2",
      "day": "3",
      "year": "2011"
    }],
    "invalid": [{
      "month": "2"
    }, {
      "month": "2",
      "day": "3"
    }]
  },
  "TIME": {
    "valid": [{
      "hours": "1",
      "minutes": "1"
    }],
    "invalid": [{
      "hours": "0"
    }, {
      "hours": "0",
      "minutes": "1"
    }]
  },
  "EMAIL": {
    "valid": ["a@a"],
    "invalid": ["a"]
  },
  "NUMBER": {
    "invalid": ["a", "a123", "123+"],
    "valid": ["123", "1,23", "1.23", "1-23", "+15107671234"]
  }
}
;Fixtures.Conditional = {
  "values": {
    "address": {
      "tests": [
        {
          "in": {
            "street": "foo",
            "city": "bar"
          },
          "out": "foo bar US"
        },
        {
          "in": {
            "street": "foo",
            "city": "bar",
            "country": "baz"
          },
          "out": "foo bar baz"
        }
      ],
    },
    "checkboxes": {
      "attrs": {
        "field_options": {
          "options": [
            {
              "label": "bar",
              "checked": false
            }
          ]
        }
      },
      "tests": [
        {
          "in": {
            "bar": true,
            "Other": "who"
          },
          "out": "bar who"
        }
      ],
    },
    "radio": {
      "tests": [
        {
          "in": {
            "selected": "yo"
          },
          "out": "yo"
        }
      ],
    },
    "table": {
      "attrs": {
        "field_options": {
          "columns": [
            {
              "label": "one"
            },
            {
              "label": "two"
            }
          ]
        },
      },
      "tests": [
        {
          "in": {
            "one": ["a", "b"],
            "two": ["c", "d"]
          },
          "out": "a b c d"
        }
      ],
    },
    "date": {
      "tests": [
        {
          "in": {
            "month": 11,
            "day": 11,
            "year": 1234
          },
          "out": "11/11/1234"
        }
      ],
    },
    "time": {
      "tests": [
        {
          "in": {
            "minutes": 12,
            "hours": 12,
            "am_pm": "AM"
          },
          "out": "12:12:00 AM"
        }
      ],
    },
    "price": {
      "tests": [
        {
          "in": {
            "dollars": 1
          },
          "out": "1.00"
        },
        {
          "in": {
            "cents": 99
          },
          "out": "0.99"
        }
      ]
    }
  },
  "methods": {
    "eq": {
      "value": "asd",
      "true": ["asd", "ASD"],
      "false": ["as"]
    },
    "contains": {
      "value": "foo",
      "true": ["foobar", "foo"],
      "false": ["fo"]
    },
    "lt": {
      "value": "12.99",
      "true": ["12.98", "12", "1"],
      "false": ["12.999", "13", "100"]
    },
    "gt": {
      "value": "12.99",
      "true": ["12.999", "13", "100"],
      "false": ["12.98", "12", "1"]
    },
    "shorter": {
      "value": "5",
      "true": ["asdf", "a"],
      "false": ["asdfa", "asdfaa"]
    },
    "longer": {
      "value": "5",
      "true": ["asdfaa", "asdfaaa"],
      "false": ["asdfa", "a"]
    }
  }
}
;