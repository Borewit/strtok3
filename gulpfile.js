const gulp = require('gulp');
const typescript = require('gulp-tsc');
const clean = require('gulp-clean');
const mocha = require('gulp-mocha');
const sourcemaps = require('gulp-sourcemaps');

const buildPath = 'lib';

gulp.task('default', ['compile']);

gulp.task('clean', function () {
  return gulp.src([buildPath], {read: false})
    .pipe(clean());
});

gulp.task('compile', ['clean'], function () {
  return gulp.src(['src/**/*.ts'])
    .pipe(sourcemaps.init()) // generate sourcemaps
    .pipe(typescript({
      declaration: true, target: 'es5'
    }))
    .pipe(sourcemaps.write()) // add the sourcemaps to the .js file
    .pipe(gulp.dest(buildPath))
});

gulp.task('test-compile', ['compile'], function () {
  return gulp.src(['test/**/*.ts'])
    .pipe(typescript(), {target: 'es5'})
    .pipe(gulp.dest('./'))
});

gulp.task('test', ['test-compile'], function () {
  return gulp.src('test', { read: false })
    .pipe(mocha())
});

