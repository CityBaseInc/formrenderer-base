# This order is very important!
ALL_TASKS = ['eco:all', 'coffee:all', 'concat:all', 'stylus:all', 'clean:compiled']

module.exports = (grunt) ->

  grunt.loadNpmTasks('grunt-contrib-coffee')
  grunt.loadNpmTasks('grunt-contrib-concat')
  grunt.loadNpmTasks('grunt-contrib-cssmin')
  grunt.loadNpmTasks('grunt-eco')
  grunt.loadNpmTasks('grunt-contrib-stylus')
  grunt.loadNpmTasks('grunt-contrib-uglify')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadNpmTasks('grunt-release')
  # grunt.loadNpmTasks('grunt-karma')

  grunt.initConfig

    pkg: '<json:package.json>'
    configFolder: 'config'
    srcFolder: 'src'
    compiledFolder: 'compiled' # Temporary holding area.
    distFolder: 'dist'
    vendorFolder: 'vendor'
    testFolder: 'test'

    eco:
      all:
        options:
          basePath: '<%= srcFolder %>/templates'
        files:
          '<%= compiledFolder %>/templates.js': '<%= srcFolder %>/templates/**/*.eco'

    coffee:
      all:
        files:
          '<%= compiledFolder %>/scripts.js': [
            '<%= configFolder %>/rivets.coffee'
            '<%= srcFolder %>/main.coffee'
            '<%= srcFolder %>/collection.coffee'
            '<%= srcFolder %>/validators/base_validator.coffee'
            '<%= srcFolder %>/validators/*.coffee'
            '<%= srcFolder %>/models.coffee'
            '<%= srcFolder %>/views.coffee'
          ]

    concat:
      all:
        files:
          '<%= distFolder %>/formrenderer.js': '<%= compiledFolder %>/*.js'
          '<%= vendorFolder %>/js/vendor.js': [
            'bower_components/jquery/dist/jquery.js'
            'bower_components/underscore/underscore.js'
            'bower_components/backbone/backbone.js'
            'bower_components/underscore.string/dist/underscore.string.min.js'
            'bower_components/underscore.simpleformat.js/index.js'
            'bower_components/underscore.toboolean.js/index.js'
            'bower_components/before_unload.js/index.js'
            'bower_components/sanitize.js/lib/sanitize.js'
            'bower_components/underscore.sanitize.js/index.js'
            'bower_components/backbone-deep-model/distribution/deep-model.js'
            'bower_components/rivets/dist/rivets.js'
            'bower_components/allcountries.js/index.js'
          ]

    stylus:
      all:
        files:
          '<%= distFolder %>/formrenderer.css': '<%= srcFolder %>/styles/base.styl'

    cssmin:
      dist:
        files:
          '<%= distFolder %>/formrenderer-min.css': '<%= distFolder %>/formrenderer.css'

    clean:
      compiled:
        ['<%= compiledFolder %>']

    uglify:
      dist:
        files:
          '<%= distFolder %>/formrenderer-min.js': '<%= distFolder %>/formrenderer.js'

    watch:
      all:
        files: ['<%= srcFolder %>/**/*.{coffee,eco,styl}']
        tasks: ALL_TASKS

    # # To test, run `grunt --no-write -v release`
    release:
      options:
        npm: false

    # karma:
    #   unit:
    #     configFile: '<%= testFolder %>/karma.conf.coffee'

  grunt.registerTask 'default', ALL_TASKS
  grunt.registerTask 'dist', ['default', 'cssmin:dist', 'uglify:dist']
  grunt.registerTask 'release', ['default', 'dist', 'release']
  # grunt.registerTask 'test', ['dist', 'karma']
