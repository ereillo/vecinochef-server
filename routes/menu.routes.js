const router = require("express").Router();
const bcrypt = require("bcryptjs");

const jwt = require("jsonwebtoken");
const isAuthenticated = require("../middlewares/isAuthenticated");

//TODO: importación de modelos
const User = require("../models/User.model.js");
const Menu = require("../models/Menu.model");
const Especialidad = require("../models/Especialidad.model");

//TODO: RUTAS MENU
//GET ("/menu/home") => Lista de menús por días
router.get("/home", isAuthenticated, async (req, res, next) => {
    try {
      const response = await Menu.find().select({
        _id: 1,
        platoNombre: 1,
        postreNombre: 1,
        menuPrecio: 1,
        weekDay: 1,
        participantes: 1,
      })
      .populate({
        path: "creador",
        model: "User",
        select: "userName",
      });

      const menuConParticipantes = await Promise.all(
        response.map(async (menu)=>{

          const participantes = await User.find({
            _id: { $in: menu.participantes},
          }).select("userName _id");

          return {
            ...menu.toObject(),
            participantes: participantes.map((user)=>({
              _id: user._id,
              userName: user.userName,
            })),
          };
        })
      );
      res.json(menuConParticipantes);
    } catch (error) {
      next(error);
    }
  });

  //POST ("/menu/home/:menuId") => Para apuntarte a un menú
router.post("/home/apuntar/:menuId", isAuthenticated, async (req, res, next) => {
    // const { participantes } = req.body;
    const userId = req.payload._id
    
   
     try {
      const menuId = req.params.menuId;

      const menu = await Menu.findById(menuId);

      // Verificamos si el usuario ya está apuntado
      if (menu.participantes.includes(userId)) {
        return res.json({
          message: "El usuario ya estaba registrado en el menú",
        });
      }

      // ...si no, agregamos con  addtoSet porque push no estaba funcionando
      await Menu.findByIdAndUpdate(menuId, {
        $addToSet: { participantes: userId },
      });

      res.json({
        message: "El usuario se ha registrado correctamente en el menú",
      });
    } catch (error) {
      next(error);
    }
  
  });

  
  //POST ("/menu/home/:menuId") => Para desapuntarse a un menú
router.post("/home/desapuntar/:menuId", isAuthenticated, async (req, res, next) => {
    // const { participantes } = req.body;
    const userId = req.payload._id
    
     try {
      const menuId = req.params.menuId;

      const menu = await Menu.findById(menuId);

      // Verificamos si el usuario ya está apuntado
      if (!menu.participantes.includes(userId)) {
        return res.json({
          message: "El usuario no estaba registrado en el menú",
        });
      }

      // ...si no, agregamos con  addtoSet porque push no estaba funcionando
      await Menu.findByIdAndUpdate(menuId, {
        $pull: { participantes: userId },
      });

      res.json({
        message: "El usuario se ha desapuntado correctamente del menú",
      });
    } catch (error) {
      next(error);
    }
  
  });

//GET ("/menu/myprofile") => Menus creados por el usuario logeado
router.get("/myprofile", isAuthenticated, async (req, res, next) => {
    try {
        const response = await Menu.find()
        .select({
        platoNombre: 1,
        postreNombre: 1,
        menuPrecio: 1,
        creador: 1, 
        participantes: 1,
        }).populate({
            path: 'creador',
            model: "User",
            select: 'userName', 
        })
        res.json(response)
        console.log(response + "MENUCONSOLE")
     } catch (error) {
        next(error)
     }
  })

//GET ("/menu/menuApuntado/myprofile") => Menús en los que el usuario se ha apuntado
router.get("/menuApuntado/myprofile", isAuthenticated, async (req, res, next) => {

   console.log("TEST")

  const userId = req.payload._id

try {
     const response = await Menu.find({
      participantes: { $in: userId },
     })
    console.log(response)
    res.json(response)
} catch (error) {
  console.log(error)
}
})

//GET ("/menu/menuCreado/myprofile") => Menús creados por el usuario
router.get("/menuCreado/myprofile", isAuthenticated, async (req, res, next) => {

 const userId = req.payload._id

try {
   const response = await Menu.find({ creador: userId })
   console.log(response)
   res.json(response)
} catch (error) {
 console.log(error)
}
})

//GET ("/menu/menuCreado/menu/:userId") => Menús creados por otro usuario
router.get("/menuCreado/menu/:userId", isAuthenticated, async (req, res, next) => {

  const userId = req.params.userId
  console.log(req.params.userId + "ESTE CONSOLE")
 
 try {
  const response = await Menu.find({ creador: userId });
    console.log(response)
    res.json(response)
 } catch (error) {
  console.log(error)
 }
 })

  
router.post("/add-menu", isAuthenticated, async (req, res, next) => {
    const { platoNombre, postreNombre, menuPrecio, weekDay } = req.body;
  console.log(req.body)
    try {

      const platoEspecialidad = await Especialidad.findOne({ especialidadNombre: platoNombre });
      const postreEspecialidad = await Especialidad.findOne({ especialidadNombre: postreNombre });
      console.log(platoEspecialidad, postreEspecialidad)
      
      const creadorId = req.payload._id;
      

      await Menu.create({
        platoNombre: platoEspecialidad._id,
        postreNombre: postreEspecialidad._id,
        creador: creadorId,
        menuPrecio,
        weekDay,
      });

      res.json("Menú creado correctamente");
    } catch (error) {
      next(error);
    }
});

  
  //PUT("/menu/add-menu"=> renderiza la infor y añade el menú creado a la DB)
  router.put("/add-menu", isAuthenticated, async (req, res, next) => {
    const {
      creador,
      participantes,
      platoNombre,
      postreNombre,
      menuPrecio,
      weekDay,
    } = req.body;

    const creadorId = req.payload._id
    try {
      console.log(req.body, "body del menú");
      await Menu.create({
      creador: creadorId,
      participantes,
      platoNombre,
      postreNombre,
      menuPrecio,
      weekDay,
      });
      res.json("todo bien, menú creado");
    } catch (error) {
      next(error);
    }
  });

//GET ("/menu/edit-menu/:menuId") => info de un menú concreto para el form de edit
router.get("/edit-menu/:menuId", isAuthenticated, async (req, res, next) => {
  try {
    console.log(req.body, "cosas del menú")
    const response = await Menu.findById(req.params.menuId)
    res.json(response)
  } catch (error) {
    next(error)
  }

})

//PUT ("/menu/edit-menu/menuId") => actualizar la info de un menú
router.put("/edit-menu/:menuId", isAuthenticated, async (req, res, next) => {
    const {
      
      participantes,
      platoNombre,
      postreNombre,
      menuPrecio,
      weekDay,
      } = req.body;
      console.log(req.body);
      try {
      const platoEspecialidad = await Especialidad.findOne({ especialidadNombre: platoNombre });
      const postreEspecialidad = await Especialidad.findOne({ especialidadNombre: postreNombre });
      console.log(platoEspecialidad, postreEspecialidad)
        const response = await Menu.findByIdAndUpdate(
          req.params.menuId,
          {
      
      participantes,
      platoNombre: platoEspecialidad._id,
      postreNombre: postreEspecialidad._id,
      menuPrecio,
      weekDay,
          },{new:true}
        );
        res.json(response)
      } catch (error) {
        next(error)
      }
    }); 

//DELETE "/esp/edit-menu/:menuId" => borrar un menú
router.delete("/edit-menu/:menuId", isAuthenticated, async (req, res, next) => {

    const {menuId} = req.params
    try {
       await Menu.findByIdAndDelete(menuId)
       res.json("menú borrado")
    } catch (error) {
       next (error)
    }

 })

 //GET ("/menu/")

module.exports = router;
