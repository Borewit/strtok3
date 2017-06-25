const gulp = require('gulp');
const typescript = require('gulp-tsc');
const clean = require('gulp-clean');
const mocha = require('gulp-mocha');
const del = require('del');

const buildPath = 'lib';

gulp.task('default', ['compile']);

// Not all tasks need to use streams
// A gulpfile is just another node program and you can use any package available on npm
gulp.task('clean', function () {
  // You can use multiple globbing patterns as you would with `gulp.src`
  return del([buildPath]);
});

gulp.task('compile', ['clean'], function () {
  // Minify and copy all JavaScript (except vendor scripts)
  // with sourcemaps all the way down
  return gulp.src(['src/**/*.ts'])
    .pipe(typescript({
      declaration: true, target: 'es5'
    })) // ({tmpDir:'.tmp'})
    .pipe(gulp.dest(buildPath))
});

gulp.task('test-compile', ['compile'], function () {
  // Minify and copy all JavaScript (except vendor scripts)
  // with sourcemaps all the way down
  return gulp.src(['test/**/*.ts'])
    .pipe(typescript(), {target: 'es5'})
    .pipe(gulp.dest('test'))
});

gulp.task('test', ['test-compile'], function () {
  // Minify and copy all JavaScript (except vendor scripts)
  // with sourcemaps all the way down
  return gulp.src('test', { read: false })
  //.pipe(mocha({require: 'ts-node/register'}))
    .pipe(mocha())
});

