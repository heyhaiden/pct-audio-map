/**
 * Deep imports keep the About card to the handful of Babylon modules it uses;
 * the `@babylonjs/core` barrel pulls in the whole engine. Memoized so a nav
 * hover can start the download and the card reuses the same promise.
 */
let modules: ReturnType<typeof importModules> | null = null

function importModules() {
  return Promise.all([
    import("@babylonjs/core/Engines/engine"),
    import("@babylonjs/core/scene"),
    import("@babylonjs/core/Cameras/arcRotateCamera"),
    import("@babylonjs/core/Lights/hemisphericLight"),
    import("@babylonjs/core/Lights/directionalLight"),
    import("@babylonjs/core/Maths/math.vector"),
    import("@babylonjs/core/Maths/math.color"),
    import("@babylonjs/core/Meshes/Builders/boxBuilder"),
    import("@babylonjs/core/Meshes/Builders/planeBuilder"),
    import("@babylonjs/core/Meshes/Builders/groundBuilder"),
    import("@babylonjs/core/Materials/standardMaterial"),
    import("@babylonjs/core/Materials/Textures/dynamicTexture"),
    import("@babylonjs/core/Materials/Textures/texture"),
    import("@babylonjs/core/Meshes/transformNode"),
  ]).then(
    ([engine, scene, camera, hemi, directional, vector, color, box, plane, ground, standard, dynamic, texture, node]) => ({
      Engine: engine.Engine,
      Scene: scene.Scene,
      ArcRotateCamera: camera.ArcRotateCamera,
      HemisphericLight: hemi.HemisphericLight,
      DirectionalLight: directional.DirectionalLight,
      Vector3: vector.Vector3,
      Color3: color.Color3,
      Color4: color.Color4,
      CreateBox: box.CreateBox,
      CreatePlane: plane.CreatePlane,
      CreateGround: ground.CreateGround,
      StandardMaterial: standard.StandardMaterial,
      DynamicTexture: dynamic.DynamicTexture,
      Texture: texture.Texture,
      TransformNode: node.TransformNode,
    }),
  )
}

export function loadFieldNotesBabylon() {
  modules ??= importModules().catch((error) => {
    modules = null
    throw error
  })
  return modules
}
