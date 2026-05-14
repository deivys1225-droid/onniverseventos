# `android/app/libs/`

Carpeta para librerias **locales** (`.jar` / `.aar`) que NO bajan de Maven /
JCenter ni del repositorio de Google. Todo lo que copies aqui lo recoge
Gradle automaticamente por la regla:

```gradle
// android/app/build.gradle
repositories {
    flatDir { dirs '../capacitor-cordova-android-plugins/src/main/libs', 'libs' }
}

dependencies {
    implementation fileTree(include: ['*.jar', '*.aar'], dir: 'libs')
}
```

## Google Cardboard SDK (open-source, sucesor de `com.google.vr:sdk-base`)

- Repo:     <https://github.com/googlevr/cardboard>
- Releases: <https://github.com/googlevr/cardboard/releases>

### Pasos para integrarlo a mano

1. Bajar el AAR mas reciente desde **Releases** (ej. `sdk-1.24.0.aar`).
2. Copiarlo a esta carpeta (`android/app/libs/cardboard-sdk.aar`,
   el nombre da igual mientras termine en `.aar`).
3. Sync de Gradle desde Android Studio (o `./gradlew :app:assembleDebug`).
4. Importar en codigo:
   ```java
   import com.google.cardboard.sdk.HeadTracker;
   import com.google.cardboard.sdk.QrCode;
   ```
5. (Opcional) declarar la categoria `CARDBOARD` en `AndroidManifest.xml`
   para que la app aparezca en el panel Cardboard del SO.

> NOTA: el viejo `com.google.vr:sdk-base:1.190.0` esta retirado (JCinter
> cerro en 2022). El SDK actual de Cardboard es el repo de arriba y se
> distribuye solo como AAR pre-compilado (no via Maven).
