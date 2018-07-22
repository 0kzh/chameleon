var browserify = require('browserify');
var source = require('vinyl-source-stream');
var gulp = require('gulp');
var livereload = require('gulp-livereload');
var gutil = require('gulp-util');

var paths = [
  'vendor/jquery.min.js',
  'vendor/draggabilly.pkgd.min.js',
  'js/chrome-tabs.js',
  'js/history-db.js',
  'js/settings-db.js',
  'js/browser.js'
];

function handleError(err) {
  console.log(err.toString());
  this.emit('end');
}

gulp.task('scripts', function() {
  return browserify({ 
    entries: paths,
    node: true
  })
    .bundle()
    .on('error', gutil.log)
    .pipe(source('bundle.js'))
    .pipe(gulp.dest('./pages'))
    .pipe(livereload());
});

gulp.task('watch', function() {
  livereload.listen();
  gulp.watch(paths, ['scripts']);
});

gulp.task('default', ['scripts', 'watch']);