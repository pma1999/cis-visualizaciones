import { useEffect, useState } from "react";
import { getDatos } from "../api/cisApi";
import { API_URL } from "../api/cisApi";

export default function DataTable({ variable }) {
  const [datos, setDatos] = useState([]);
  const [etiquetas, setEtiquetas] = useState({});

  useEffect(() => {
    async function fetchData() {
      const response = await fetch(`${API_URL}/metadatos`);
      const metadata = await response.json();
      setEtiquetas(metadata.etiquetas_valores[variable] || {});
      
      const datosResponse = await getDatos(variable);
      setDatos(datosResponse);
    }

    if (variable) fetchData();
  }, [variable]);

  if (!variable) return <p>Selecciona una variable para ver los datos.</p>;
  if (datos.length === 0) return <p>Cargando datos...</p>;

  return (
    <div>
      <h2>Datos de {variable}</h2>
      <table border="1">
        <thead>
          <tr>
            <th>{variable}</th>
          </tr>
        </thead>
        <tbody>
          {datos.slice(0, 10).map((item, index) => (
            <tr key={index}>
              <td>{etiquetas[item[variable]] || item[variable]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
