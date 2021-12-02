import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Client } from "pg";

const app = express();

/** Parses JSON data in a request automatically */
app.use(express.json());
/** To allow 'Cross-Origin Resource Sharing': https://en.wikipedia.org/wiki/Cross-origin_resource_sharing */
app.use(cors());

// read in contents of any environment variables in the .env file
dotenv.config();
// use the environment variable PORT, or 4000 as a fallback
const PORT_NUMBER = process.env.PORT ?? 4000;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// const client = new Client({
//   database: "to-do-list",
// });

client.connect();
// ROUTES
// get all todos
app.get("/todos", async (req, res) => {
  try {
    const allToDos = await client.query(
      "SELECT * FROM todos ORDER BY completed"
    );
    res.status(200).json({
      status: "success",
      data: allToDos.rows,
    });
  } catch (err) {
    console.error(err);
  }
});

app.get("/", async (req, res) => {
  try {
    const allToDos = await client.query(
      "SELECT * FROM todos ORDER BY completed"
    );
    res.status(200).json({
      status: "success",
      data: allToDos.rows,
    });
  } catch (err) {
    console.error(err);
  }
});

// create a todo
app.post("/todos", async (req, res) => {
  const { tasks, due_date, completed } = req.body;
  if (typeof tasks === "string" && typeof due_date === "string") {
    if (completed) {
      const createdToDO = await client.query(
        "INSERT INTO todos(id, tasks, due_date, creation_date, completed) VALUES (default, $1, $2,default, $3) RETURNING *",
        [tasks, due_date, completed]
      );
      res.status(201).json({
        status: "success",
        data: {
          signature: createdToDO.rows, //return the relevant data (including its db-generated id)
        },
      });
    } else {
      const createdToDO = await client.query(
        "INSERT INTO todos(id, tasks, due_date) VALUES (default, $1, $2) RETURNING *",
        [tasks, due_date]
      );
      res.status(201).json({
        status: "success",
        data: {
          signature: createdToDO.rows, //return the relevant data (including its db-generated id)
        },
      });
    }
  } else {
    res.status(400).json({
      status: "fail",
      data: {
        name: "A string value for tasks is required in your JSON body",
      },
    });
  }
});

// get a todo
app.get("/todos/:id", async (req, res) => {
  const { id } = req.params;
  const result = await client.query("SELECT * FROM todos WHERE id = $1", [id]);
  console.log(result.rowCount);

  if (result.rowCount === 1) {
    const todo = await client.query("SELECT * FROM todos WHERE id=$1", [id]);
    res.status(200).json({
      status: "success",
      data: todo.rows[0],
    });
  } else {
    res.status(404).json({
      status: "fail",
      data: {
        id: "Could not find a signature with that id identifier",
      },
    });
  }
});

// delete a todo
app.delete("/todos/:id", async (req, res) => {
  const { id } = req.params; // params are string type

  const queryResult = await client.query("DELETE FROM todos WHERE id = $1", [
    id,
  ]);
  const didRemove = queryResult.rowCount === 1;

  if (didRemove) {
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/DELETE#responses
    // we've gone for '200 response with JSON body' to respond to a DELETE
    //  but 204 with no response body is another alternative:
    //  res.status(204).send() to send with status 204 and no JSON body
    res.status(200).json({
      status: "success",
    });
  } else {
    res.status(404).json({
      status: "fail",
      data: {
        id: "Could not find a todo with that id identifier",
      },
    });
  }
});

// update a todo
app.put("/todos/:id", async (req, res) => {
  //  :id refers to a route parameter, which will be made available in req.params.id
  const { tasks, due_date } = req.body;
  const { id } = req.params;
  if (typeof tasks === "string" && typeof due_date === "string") {
    const result = await client.query("SELECT * FROM todos WHERE id = $1", [
      id,
    ]);
    console.log(result.rowCount);

    if (result.rowCount === 1) {
      const updatedToDo = await client.query(
        "UPDATE todos SET tasks = $1, due_date= $2 WHERE id= $3",
        [tasks, due_date, id]
      );
      res.status(200).json({
        status: "success",
        data: {
          todos: updatedToDo.rows[0],
        },
      });
    } else {
      res.status(404).json({
        status: "fail",
        data: {
          id: "Could not find a todo with that id identifier",
        },
      });
    }
  } else {
    res.status(404).json({
      status: "fail",
      data: {
        id: "Could not find a todo with that id identifier",
      },
    });
  }
});

app.put("/todos/:id/complete", async (req, res) => {
  const id = parseInt(req.params.id);
  const queryResult = await client.query(
    "UPDATE todos SET completed = NOT completed WHERE id = $1",
    [id]
  ); //FIXME-TASK: update the signature with given id in the DB.
  if (queryResult.rowCount === 1) {
    const updatedTask = queryResult.rows[0];
    res.status(200).json({
      status: "success",
      data: {
        task: updatedTask,
      },
    });
  } else {
    res.status(404).json({
      status: "fail",
      data: {
        id: "Could not find a task with that id identifier",
      },
    });
  }
});

app.listen(PORT_NUMBER, () => {
  console.log(`Server is listening on port ${PORT_NUMBER}!`);
});
