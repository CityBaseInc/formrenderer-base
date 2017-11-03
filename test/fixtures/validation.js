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
;
