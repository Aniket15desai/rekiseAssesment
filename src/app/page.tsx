'use client';
import React, { useState, useRef, useEffect } from "react";
import "ol/ol.css";
import { Map, View } from "ol";
import { OSM } from "ol/source";
import { Tile as TileLayer } from "ol/layer";
import Draw from "ol/interaction/Draw";
import { fromLonLat, toLonLat } from "ol/proj";
import { LineString, Polygon } from "ol/geom";
import { Vector as VectorSource } from "ol/source";
import { Vector as VectorLayer } from "ol/layer";

export default function Home() {
  const [map, setMap] = useState<Map | null>(null);
  const [lineStringCoords, setLineStringCoords] = useState<number[][]>([]);
  const [polygonCoords, setPolygonCoords] = useState<number[][][]>([]);
  const [modalType, setModalType] = useState<"starting" | "mission" | null>("starting");
  const [dropdownIndex, setDropdownIndex] = useState<number | null>(null);
  const lineSource = useRef(new VectorSource());
  const drawInteraction = useRef<Draw | null>(null);

  useEffect(() => {
    const initialMap = new Map({
      target: "map",
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        new VectorLayer({
          source: lineSource.current,
        }),
      ],
      view: new View({
        center: fromLonLat([72.868679, 19.054180]),
        zoom: 10,
      }),
    });
    setMap(initialMap);

    return () => initialMap.setTarget(undefined);
  }, []);

  const enableDrawingLine = () => {
    if (!map) return;
    if (drawInteraction.current) map.removeInteraction(drawInteraction.current);

    drawInteraction.current = new Draw({
      source: lineSource.current,
      type: "LineString",
    });

    map.addInteraction(drawInteraction.current);

    drawInteraction.current.on("drawend", (event) => {
      const geometry = event.feature.getGeometry() as LineString;
      const coords = geometry.getCoordinates().map((coord) => toLonLat(coord));
      setLineStringCoords(coords);
      setModalType("mission");
    });
  };

  const enableDrawingPolygon = (callback?: (coords: number[][]) => void) => {
    if (!map) return;
    if (drawInteraction.current) map.removeInteraction(drawInteraction.current);

    drawInteraction.current = new Draw({
      source: lineSource.current,
      type: "Polygon",
    });

    map.addInteraction(drawInteraction.current);

    drawInteraction.current.on("drawend", (event) => {
      const geometry = event.feature.getGeometry() as Polygon;
      const coords = geometry
        .getCoordinates()[0]
        .map((coord) => toLonLat(coord));

      if (callback) {
        callback(coords);
      } else {
        setPolygonCoords((prev) => [...prev, coords]);
        setModalType("mission");
      }

      if (drawInteraction.current) {
        map.removeInteraction(drawInteraction.current);
      }
      drawInteraction.current = null;
    });
  };

  const insertPolygon = (index: number, position: "before" | "after") => {
    closeModal()
    enableDrawingPolygon((coords) => {
      const updatedCoords = [...lineStringCoords];
      if (position === "before") {
        updatedCoords.splice(index, 0, ...coords);
      } else {
        updatedCoords.splice(index + 1, 0, ...coords);
      }
      setLineStringCoords((prev) => [...prev, ...coords]);

      setPolygonCoords((prev) => [...prev, coords]);
      setModalType("mission");

      setDropdownIndex(null);
    });
  };

  const calculateDistance = (coord1: number[], coord2: number[]): number => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6378;
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const closeModal = () => {
    setModalType(null);
  };

  const renderModal = () => {
    if (modalType === "starting") {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-3/4 max-w-md">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Mission Creation</h3>
              <button
                className="text-gray-600 hover:text-gray-900"
                onClick={closeModal}
              >
                &times;
              </button>
            </div>
            <div className="mt-4 bg-gray-100 border border-gray-300 rounded p-4 text-gray-600">
              <p>Click on the map to mark points of the route and then press ↵ to complete the route.</p>
            </div>
            <div className="flex justify-end mt-4">
              <button
                className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                onClick={() => {
                  enableDrawingLine()
                  closeModal()
                }}
              >
                Start Mission
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (modalType === "mission") {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-3/4 max-w-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Mission Creation</h3>
              <button
                className="text-gray-600 hover:text-gray-900"
                onClick={() => {
                  enableDrawingLine()
                  closeModal()
                }}
              >
                &times;
              </button>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="table-auto w-full border-collapse border border-gray-300 text-center">
                <thead>
                  <tr>
                    <th className="border border-gray-300 px-4 py-2">WP</th>
                    <th className="border border-gray-300 px-4 py-2">Coordinates</th>
                    <th className="border border-gray-300 px-4 py-2">Distance (km)</th>
                    <th className="border border-gray-300 px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lineStringCoords.map((coord, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-4 py-2">{`0${index + 1}`}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        {coord[1].toFixed(6)}, {coord[0].toFixed(6)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {index > 0
                          ? calculateDistance(
                              lineStringCoords[index - 1],
                              coord
                            ).toFixed(2)
                          : "--"}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <button
                          className="text-gray-500 hover:text-gray-800"
                          onClick={() =>
                            setDropdownIndex(dropdownIndex === index ? null : index)
                          }
                        >
                          &#8942;
                        </button>
                        {dropdownIndex === index && (
                          <div className="absolute bg-white border border-gray-300 rounded shadow-lg mt-2 z-10">
                            <button
                              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 w-full text-left"
                              onClick={() => insertPolygon(index, "before")}
                            >
                              Insert Polygon
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {polygonCoords.length > 0 && (
                    <>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2" colSpan={4}>
                          Polygon Coordinates
                        </td>
                      </tr>
                      {polygonCoords.map((coords, index) => (
                        <tr key={index}>
                          <td className="border border-gray-300 px-4 py-2">{`0${index + 1}`}</td>
                          <td className="border border-gray-300 px-4 py-2">
                            Polygon {index + 1}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">--</td>
                          <td className="border border-gray-300 px-4 py-2"></td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mt-4">
              <button
                className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                onClick={() => {
                  enableDrawingLine()
                  closeModal()
                }}
              >
                Generate Data
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div>
      {renderModal()}
      <div id="map" className="w-full h-[100vh] border border-gray-300"></div>
    </div>
  );
}