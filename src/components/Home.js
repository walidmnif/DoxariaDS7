import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./home.css";
import { FaVolumeUp } from "react-icons/fa";
import axios from "axios";
import { FaUpload } from "react-icons/fa"; // Font Awesome Upload icon

const NavBar = ({ handleLogout, user }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  return (
    <div className="header">
      <img src="/DoxLogo.png" alt="Dox Logo" className="logo" />
      <div className="user-icon" onClick={() => setShowDropdown(!showDropdown)}>
        <h4>{user}</h4>
        {showDropdown && (
          <div className="dropdown-menu">
            <button onClick={handleLogout}>Logout</button>
          </div>
        )}
      </div>
    </div>
  );
};

const EditableCell = ({ value, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value === "---" ? "" : value);

  const handleBlur = () => {
    setEditing(false);
    const finalValue = currentValue.trim() === "" ? "---" : currentValue;
    onChange(finalValue === "---" ? "" : finalValue);
  };

  return editing ? (
    <input
      autoFocus
      value={currentValue}
      onChange={(e) => setCurrentValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleBlur();
      }}
    />
  ) : (
    <span onClick={() => setEditing(true)}>
      {value === "" || value === null || value === undefined ? "---" : value}
    </span>
  );
};

const Home = (props) => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState("fr");
  const [data, setData] = useState();
  const [translatedData, setTranslatedData] = useState(null);
  const [selectedImageName, setSelectedImageName] = useState(null);
  const [documentType, setDocumentType] = useState(null);
  const [user] = useState(() => JSON.parse(localStorage.getItem("user")) || null);
  const [loadingTranslation, setLoadingTranslation] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false); 
  const [abreviation, setAbreviation] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnType, setNewColumnType] = useState("text");

  const Logout = () => {
    props.handleLogout();
    navigate("/login");
  }; 

  useEffect(() => {
    if (language !== "fr") {
      translateData(language);
    } else {
      setTranslatedData(null);
    }
  }, [language]);

  const translateData = async (selectedLang) => {
    setLoadingTranslation(true);
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/translate/", {
        ...data,
        language: selectedLang,
      });
      setTranslatedData(response.data);
    } catch (error) {
      console.error("Translation error:", error);
    } finally {
      setLoadingTranslation(false);
    }
  };

  const handleImageUpload = async (event) => {
    setLoadingTable(true);
    const file = event.target.files[0];
    if (file) {
      setSelectedImageName(file.name);
      setPreviewImage(URL.createObjectURL(file));
      const formData = new FormData();
      formData.append("image", file);
      setAbreviation(null);

      try {
        const response = await axios.post("http://127.0.0.1:8000/api/classify_extract/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setDocumentType(response.data.type);
        setData(response.data.extracted_data);
        setAbreviation(response.data.abreviation);
      } catch (error) {
        console.error("Erreur lors de l'envoi de l'image:", error);
      } finally {
        setLoadingTable(false);
      }
    }
  };

  const readTableContent = async () => {
    const textToRead = JSON.stringify(data);
    try {
      await axios.post("http://127.0.0.1:8000/api/text-to-speech/", {
        phrase: textToRead,
        language,
      });
    } catch (error) {
      console.error("Erreur lors de la lecture du texte :", error);
    }
  };

  const handleEdit = (key, value, parentKey = null, index = null) => {
    const updated = { ...data };
    if (parentKey && Array.isArray(data[parentKey])) {
      updated[parentKey][index][key] = value;
    } else {
      updated[key] = value;
    }
    setData(updated);
  };

  const saveDocument = async () => {
    try {
      await axios.post("http://127.0.0.1:8000/api/save-scanned-document/", {
        user: props.user,
        document_type: documentType || "unknown",
        detected_fields: data,
        status: "pending",
      });
      alert("Document saved successfully!");
    } catch (error) {
      console.error("Error saving document:", error);
      alert("An error occurred while saving the document.");
    }
  };

  const handleAddColumn = () => {
    if (!newColumnName.trim()) return;

    const updatedData = { ...(translatedData || data) };
    
    if (newColumnType === "array") {
      if (updatedData.date_honoraires) {
        updatedData[newColumnName] = updatedData.date_honoraires.map(() => ({}));
      } else {
        updatedData[newColumnName] = [{}];
      }
    } else {
      updatedData[newColumnName] = "";
    }

    if (translatedData) {
      setTranslatedData(updatedData);
    } else {
      setData(updatedData);
    }

    setNewColumnName("");
    setShowAddColumnModal(false);
  };

  const displayData = translatedData || data;

  return (
    <div>
      <NavBar handleLogout={Logout} user={props.user} />
      <div className="home-container">
        <div className="upload-section">
          {previewImage ? (
              <>
                <img
                  src={previewImage}
                  alt="uploaded preview"
                  className="preview-image"
                  onClick={() => setPreviewMode(true)}
                />
                {previewMode && (
                  <div className="lightbox" onClick={() => setPreviewMode(false)}>
                    <img
                      src={previewImage}
                      alt="Full screen"
                      className="lightbox-image"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
              </>
            ):(<p>Upload your Image... To extract your data</p>)}
          
          <div className="upload-buttons">
            
            <label className="btn upload-document">
              <FaUpload/> Upload Image
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
            </label>
            {/*selectedImageName && <span className="file-name">{selectedImageName}</span>*/}
          </div>
        </div>
        {selectedImageName ? (
          loadingTable ? (
            <div className="spinner-container">
              <div className="spinner"></div>
            </div>
          ) : (
            <div className="data-container">
              <div className="container-row">
                <div className="data-box">
                  <div className="title-select">
                    {documentType && (
                      <p>Document Type: <strong>{documentType}</strong></p>
                    )}
                    {documentType === "Bulletin de soin" && (
                      <select onChange={(e) => setLanguage(e.target.value)} value={language}>
                        <option value="fr">Français</option>
                        <option value="ar">Arabe</option>
                        <option value="en">Anglais</option>
                      </select>
                    )}
                  </div>
                  {documentType === "Bulletin de soin" && (
                    <>
                      <h3>Extracted Data</h3>
                      {loadingTranslation ? (
                        <div className="spinner-container">
                          <div className="spinner"></div>
                        </div>
                      ) : (
                        <>
                          <table className="structured-table">
                            <thead>
                              <tr>
                                {Object.entries(displayData || {}).map(([key, value]) => {
                                  if (Array.isArray(value) && key === "date_honoraires") {
                                    return (
                                      <>
                                        <th key="date">date</th>
                                        <th key="designation">designation</th>
                                        <th key="honoraire">honoraire</th>
                                      </>
                                    );
                                  } else if (Array.isArray(value) && typeof value[0] === "object") {
                                    return value[0] && Object.keys(value[0]).map((subKey) => (
                                      <th key={`${key}-${subKey}`}>{`${key}.${subKey}`}</th>
                                    ));
                                  } else {
                                    return <th key={key}>{key}</th>;
                                  }
                                })}
                              </tr>
                            </thead>
                            <tbody key={language + JSON.stringify(displayData)}>
                              <tr>
                                {Object.entries(displayData || {}).map(([key, value]) => {
                                  if (Array.isArray(value) && key === "date_honoraires") {
                                    return (
                                      <>
                                        <td key="date">
                                          {value.map((item, i) => (
                                            <div key={`date-${i}`}>
                                              <EditableCell
                                                value={item.date || "---"}
                                                onChange={(val) => handleEdit("date", val, key, i)}
                                              />
                                            </div>
                                          ))}
                                        </td>
                                        <td key="designation">
                                          {value.map((item, i) => (
                                            <div key={`designation-${i}`}>
                                              <EditableCell
                                                value={item.designation || "---"}
                                                onChange={(val) => handleEdit("designation", val, key, i)}
                                              />
                                            </div>
                                          ))}
                                        </td>
                                        <td key="honoraire">
                                          {value.map((item, i) => (
                                            <div key={`honoraire-${i}`}>
                                              <EditableCell
                                                value={item.honoraire || "---"}
                                                onChange={(val) => handleEdit("honoraire", val, key, i)}
                                              />
                                            </div>
                                          ))}
                                        </td>
                                      </>
                                    );
                                  } else if (Array.isArray(value) && typeof value[0] === "object") {
                                    return value[0] && Object.keys(value[0]).map((subKey) => (
                                      <td key={`${key}-${subKey}`}>
                                        {value.map((item, i) => (
                                          <div key={`${key}-${subKey}-${i}`}>
                                            <EditableCell
                                              value={item[subKey] || "---"}
                                              onChange={(val) => handleEdit(subKey, val, key, i)}
                                            />
                                          </div>
                                        ))}
                                      </td>
                                    ));
                                  } else {
                                    return (
                                      <td key={key}>
                                        <EditableCell 
                                          value={value || "---"} 
                                          onChange={(val) => handleEdit(key, val)} 
                                        />
                                      </td>
                                    );
                                  }
                                })}
                              </tr>
                            </tbody>
                          </table>
                          <div className="save-button-container">
                            <button 
                              className="add-column-button"
                              onClick={() => setShowAddColumnModal(true)}
                            >
                              + Ajouter Colonne
                            </button>
                            <button className="save-button" onClick={saveDocument}>Save</button>
                          </div>
                        </>
                      )}
                      {abreviation && Object.keys(abreviation).length > 0 ? (
                        <div className="abreviations-list">
                          <h4>Abbréviations détectées :</h4>
                          <ul>
                            {Object.entries(abreviation).map(([key, value], index) => (
                              <li key={index}>
                                <strong>{key}</strong> : {value}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="abreviations-list">
                          <h4>Aucune abréviation détectée.</h4>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {documentType === "Bulletin de soin" && (
                  <div className="icons-container">
                    <FaVolumeUp className="icon" title="Lire à haute voix" onClick={readTableContent} />
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          <div>Upload Document to see more ...</div>
        )}
        {showAddColumnModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Ajouter une nouvelle colonne</h3>
              <div className="modal-input-group">
                <label>Nom de la colonne:</label>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Entrez le nom de la colonne"
                />
              </div>
              <div className="modal-input-group">
                <label>Type de colonne:</label>
                <select
                  value={newColumnType}
                  onChange={(e) => setNewColumnType(e.target.value)}
                >
                  <option value="text">Valeur simple</option>
                  <option value="array">Tableau d'objets</option>
                </select>
              </div>
              <div className="modal-buttons">
                <button onClick={() => setShowAddColumnModal(false)}>Annuler</button>
                <button onClick={handleAddColumn}>Ajouter</button>
              </div>
            </div>
          </div>
        )}
        <footer className="footer">By: DataWizards</footer>
      </div>
    </div>
  );
};

export default Home;