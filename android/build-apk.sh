#!/bin/sh
# Build the debug APK using the bundled Java 21 and Android SDK
ANDROID_HOME=/home/jarrod/android-sdk \
JAVA_HOME=/home/jarrod/jdk21 \
/home/jarrod/jdk21/bin/java \
  -Xmx64m -Xms64m \
  -Dorg.gradle.appname=gradlew \
  -classpath gradle/wrapper/gradle-wrapper.jar \
  org.gradle.wrapper.GradleWrapperMain \
  assembleDebug --no-daemon "$@"

echo ""
echo "APK: app/build/outputs/apk/debug/app-debug.apk"
