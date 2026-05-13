pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    // PREFER_PROJECT: mantiene repositorios del módulo (p. ej. flatDir en app) compatibles con Cordova/Capacitor
    repositoriesMode.set(RepositoriesMode.PREFER_PROJECT)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "OnniVers"

include(":app")
include(":capacitor-cordova-android-plugins")
project(":capacitor-cordova-android-plugins").projectDir =
    file("capacitor-cordova-android-plugins")

// Equivalente a capacitor.settings.gradle (generado por Capacitor)
include(":capacitor-android")
project(":capacitor-android").projectDir =
    file("../node_modules/@capacitor/android/capacitor")

include(":capacitor-app")
project(":capacitor-app").projectDir =
    file("../node_modules/@capacitor/app/android")
