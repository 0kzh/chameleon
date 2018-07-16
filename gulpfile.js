var browserify = require('browserify');
var source = require('vinyl-source-stream');
var gulp = require('gulp');
var livereload = require('gulp-livereload');

var paths = [
	'js/history-db.js',
	'pages/history/main.js'
];

gulp.task('scripts', function() {
  return browserify({ entries: paths })
    .bundle()
    .pipe(source('bundle.js'))
    .pipe(gulp.dest('./pages'))
    .pipe(livereload());
});

gulp.task('watch', function() {
  livereload.listen();
  gulp.watch(paths, ['scripts']);
});

gulp.task('default', ['scripts', 'watch']);