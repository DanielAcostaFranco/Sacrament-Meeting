import express from "express";
import path from "path";
import programsRouter from "./routes/programs.js";

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));

// Middlewares
app.use(express.urlencoded({ extended: true })); // for form submissions
app.use(express.json()); // for JSON (optional)
app.use(express.static(path.join(process.cwd(), "public")));

// Routes
app.get("/", (req, res) => res.render("home"));
app.use("/programs", programsRouter);

// Basic error handler (nice for debugging)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).send("Something went wrong.");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
