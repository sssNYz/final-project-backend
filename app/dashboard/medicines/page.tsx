"use client"

import type { CSSProperties, FormEvent } from "react"
import { useMemo, useState } from "react"

import { FileText, Pill, Search, Trash2 } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

type UsageType = "oral" | "topical"

type MedicineRow = {
  id: string
  imageUrl?: string
  genericNameTh: string
  genericNameEn: string
  brandName: string
  usageType: UsageType
  indications: string
  instructions: string
  adverseEffects: string
  contraindications: string
  precautions: string
  storage: string
}

const USAGE_LABELS: Record<UsageType, string> = {
  oral: "ยากิน",
  topical: "ยาใช้ภายนอก",
}

const initialMedicines: MedicineRow[] = [
  {
    id: "paracetamol",
    genericNameTh: "พาราเซตามอล",
    genericNameEn: "Paracetamol",
    brandName: "Tylenol",
    usageType: "oral",
    imageUrl: "",
    indications: "บรรเทาอาการปวดและลดไข้",
    instructions: "รับประทานทุก 4-6 ชั่วโมง เมื่อมีอาการ หรือทำตามคำแนะนำแพทย์",
    adverseEffects: "อาจมีผื่นคัน หรือพิษต่อตับหากใช้เกินขนาด",
    contraindications: "ห้ามใช้ในผู้ที่มีประวัติแพ้ยาพาราเซตามอลอย่างรุนแรง",
    precautions: "ใช้ด้วยความระมัดระวังในผู้ป่วยโรคตับ หรือดื่มแอลกอฮอล์เป็นประจำ",
    storage: "เก็บที่อุณหภูมิห้อง หลีกเลี่ยงความชื้นและแสงแดด",
  },
  {
    id: "ibuprofen",
    genericNameTh: "ไอบูโพรเฟน",
    genericNameEn: "Ibuprofen",
    brandName: "Nurofen",
    usageType: "oral",
    imageUrl: "",
    indications: "บรรเทาอาการปวดอักเสบ เช่น ปวดข้อ ปวดกล้ามเนื้อ",
    instructions: "รับประทานพร้อมอาหาร วันละ 3-4 ครั้ง หรือทำตามคำสั่งแพทย์",
    adverseEffects: "อาจทำให้ปวดท้อง หรือเลือดออกในกระเพาะอาหาร",
    contraindications: "ห้ามใช้ในผู้ป่วยโรคกระเพาะรุนแรง หรือแพ้ยาในกลุ่ม NSAIDs",
    precautions: "ใช้ด้วยความระมัดระวังในผู้ป่วยโรคไต โรคหัวใจ หรือผู้สูงอายุ",
    storage: "เก็บในภาชนะปิดสนิท ห่างจากความร้อนและความชื้น",
  },
  {
    id: "amoxicillin",
    genericNameTh: "อะม็อกซิซิลลิน",
    genericNameEn: "Amoxicillin",
    brandName: "Amoxil",
    usageType: "oral",
    imageUrl: "",
    indications: "รักษาโรคติดเชื้อแบคทีเรีย เช่น ทางเดินหายใจ หรือหูชั้นกลางอักเสบ",
    instructions: "รับประทานตามแพทย์สั่งให้ครบคอร์ส ไม่ควรหยุดยาเอง",
    adverseEffects: "อาจมีผื่นคัน ท้องเสีย หรืออาการแพ้ยารุนแรง",
    contraindications: "ห้ามใช้ในผู้ที่แพ้เพนิซิลลินหรือเบต้าแลคแทม",
    precautions: "แจ้งแพทย์หากเคยแพ้ยาปฏิชีวนะมาก่อน หรือมีโรคตับ/ไต",
    storage: "เก็บที่อุณหภูมิห้อง หากเป็นยาน้ำให้เก็บในตู้เย็น",
  },
  {
    id: "loratadine",
    genericNameTh: "ลอราทาดีน",
    genericNameEn: "Loratadine",
    brandName: "Claritin",
    usageType: "oral",
    imageUrl: "",
    indications: "บรรเทาอาการแพ้ เช่น น้ำมูกไหล จาม คันตา",
    instructions: "รับประทานวันละครั้ง สามารถรับประทานพร้อมหรือไม่พร้อมอาหารก็ได้",
    adverseEffects: "อาจทำให้ง่วงเล็กน้อย หรือปวดศีรษะ",
    contraindications: "ห้ามใช้ในผู้ที่แพ้ลอราทาดีนอย่างรุนแรง",
    precautions: "ใช้ด้วยความระมัดระวังในหญิงตั้งครรภ์ ให้นมบุตร หรือผู้ป่วยโรคตับ",
    storage: "เก็บในภาชนะปิดสนิท ห่างจากความชื้นและแสงแดดโดยตรง",
  },
]

const PAGE_SIZE = 4

type FormState = {
  imageUrl: string
  genericNameTh: string
  genericNameEn: string
  brandName: string
  usageType: UsageType
  indications: string
  instructions: string
  adverseEffects: string
  contraindications: string
  precautions: string
  storage: string
}

const emptyForm: FormState = {
  imageUrl: "",
  genericNameTh: "",
  genericNameEn: "",
  brandName: "",
  usageType: "oral",
  indications: "",
  instructions: "",
  adverseEffects: "",
  contraindications: "",
  precautions: "",
  storage: "",
}

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<MedicineRow[]>(initialMedicines)
  const [usageFilter, setUsageFilter] = useState<"all" | UsageType>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<FormState>(emptyForm)
  const [viewingMedicine, setViewingMedicine] = useState<MedicineRow | null>(
    null,
  )

  const filteredMedicines = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()

    return medicines.filter((medicine) => {
      const matchesUsage =
        usageFilter === "all" || medicine.usageType === usageFilter

      const matchesSearch =
        search.length === 0 ||
        medicine.genericNameEn.toLowerCase().includes(search) ||
        medicine.genericNameTh.toLowerCase().includes(search) ||
        medicine.brandName.toLowerCase().includes(search)

      return matchesUsage && matchesSearch
    })
  }, [medicines, usageFilter, searchTerm])

  const { totalPages, safePage, paginatedMedicines } = useMemo(() => {
    const total = Math.max(1, Math.ceil(filteredMedicines.length / PAGE_SIZE))
    const page = Math.min(currentPage, total)
    const startIndex = (page - 1) * PAGE_SIZE
    const endIndex = startIndex + PAGE_SIZE

    return {
      totalPages: total,
      safePage: page,
      paginatedMedicines: filteredMedicines.slice(startIndex, endIndex),
    }
  }, [filteredMedicines, currentPage])

  const canGoPrev = safePage > 1
  const canGoNext = safePage < totalPages

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  function openCreateForm() {
    setEditingId("new")
    setFormValues(emptyForm)
  }

  function openEditForm(id: string) {
    const medicine = medicines.find((item) => item.id === id)
    if (!medicine) return

    setEditingId(id)
    setFormValues({
      imageUrl: medicine.imageUrl ?? "",
      genericNameTh: medicine.genericNameTh,
      genericNameEn: medicine.genericNameEn,
      brandName: medicine.brandName,
      usageType: medicine.usageType,
      indications: medicine.indications,
      instructions: medicine.instructions,
      adverseEffects: medicine.adverseEffects,
      contraindications: medicine.contraindications,
      precautions: medicine.precautions,
      storage: medicine.storage,
    })
  }

  function cancelForm() {
    setEditingId(null)
    setFormValues(emptyForm)
  }

  function handleFormChange<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setFormValues((previous) => ({
      ...previous,
      [key]: value,
    }))
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const data = {
      imageUrl: formValues.imageUrl.trim(),
      genericNameTh: formValues.genericNameTh.trim(),
      genericNameEn: formValues.genericNameEn.trim(),
      brandName: formValues.brandName.trim(),
      usageType: formValues.usageType,
      indications: formValues.indications.trim(),
      instructions: formValues.instructions.trim(),
      adverseEffects: formValues.adverseEffects.trim(),
      contraindications: formValues.contraindications.trim(),
      precautions: formValues.precautions.trim(),
      storage: formValues.storage.trim(),
    }

    if (!data.genericNameEn || !data.brandName) {
      window.alert("กรุณากรอกชื่อสามัญยา (อังกฤษ) และชื่อการค้า")
      return
    }

    if (editingId === "new" || editingId === null) {
      const newMedicine: MedicineRow = {
        id: `${Date.now()}`,
        ...data,
      }
      setMedicines((previous) => [newMedicine, ...previous])
      setCurrentPage(1)
    } else {
      setMedicines((previous) =>
        previous.map((medicine) =>
          medicine.id === editingId
            ? { ...medicine, ...data }
            : medicine,
        ),
      )
    }

    setEditingId(null)
    setFormValues(emptyForm)
  }

  function handleDelete(id: string) {
    const medicine = medicines.find((item) => item.id === id)
    const label =
      medicine &&
      `${medicine.genericNameEn} (${medicine.brandName})`

    const confirmed = window.confirm(
      label
        ? `ต้องการลบข้อมูลยา ${label} หรือไม่?`
        : "ต้องการลบข้อมูลยานี้หรือไม่?",
    )

    if (!confirmed) return

    setMedicines((previous) =>
      previous.filter((medicine) => medicine.id !== id),
    )
    setViewingMedicine((previous) =>
      previous && previous.id === id ? null : previous,
    )
  }

  function openViewDetails(id: string) {
    const medicine = medicines.find((item) => item.id === id)
    if (!medicine) return
    setViewingMedicine(medicine)
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-1 flex-col bg-background">
          <DashboardPageHeader
            title="ข้อมูลยาในระบบ"
            description="ค้นหา แก้ไข และจัดการข้อมูลยาที่ใช้ในระบบ MediBuddy"
          />
          <div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-800">
                  Filter
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-sky-700 px-4 py-1 text-xs font-semibold text-white">
                  <Pill className="h-4 w-4" />
                  <span>ข้อมูลยา</span>
                </div>
                {editingId && (
                  <form
                    onSubmit={handleFormSubmit}
                    className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
                  >
                    <div className="mb-2 font-semibold text-slate-800">
                      {editingId === "new"
                        ? "เพิ่มข้อมูลยาใหม่"
                        : "แก้ไขข้อมูลยา"}
                    </div>
                    <div className="grid gap-3 md:grid-cols-[1.6fr_3fr]">
                      <div className="space-y-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-600">
                            ลิงก์รูปภาพยา
                          </label>
                          <Input
                            value={formValues.imageUrl}
                            onChange={(event) =>
                              handleFormChange(
                                "imageUrl",
                                event.target.value,
                              )
                            }
                            className="h-9 rounded-full bg-white text-xs"
                            placeholder="เช่น https://.../medicine.png"
                          />
                          <p className="text-[11px] text-slate-400">
                            ใช้ URL เพื่อทดสอบการแสดงรูปภาพยาได้ และแก้ไขในภายหลัง
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-600">
                            รูปแบบการใช้ยา
                          </label>
                          <Select
                            value={formValues.usageType}
                            onValueChange={(value) =>
                              handleFormChange(
                                "usageType",
                                value as UsageType,
                              )
                            }
                          >
                            <SelectTrigger className="h-9 rounded-full border-none bg-slate-700/90 px-4 text-xs font-medium text-white hover:bg-slate-800/90">
                              <SelectValue placeholder="รูปแบบการใช้" />
                            </SelectTrigger>
                            <SelectContent align="start">
                              <SelectItem value="oral">
                                ยากิน
                              </SelectItem>
                              <SelectItem value="topical">
                                ยาใช้ภายนอก
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="flex min-w-0 flex-col gap-1 md:col-span-1">
                            <label className="text-xs text-slate-600">
                              ชื่อสามัญยา (ไทย)
                            </label>
                            <Input
                              value={formValues.genericNameTh}
                              onChange={(event) =>
                                handleFormChange(
                                  "genericNameTh",
                                  event.target.value,
                                )
                              }
                              className="h-9 rounded-full bg-white text-xs"
                              placeholder="เช่น พาราเซตามอล"
                            />
                          </div>
                          <div className="flex min-w-0 flex-col gap-1 md:col-span-1">
                            <label className="text-xs text-slate-600">
                              ชื่อสามัญยา (อังกฤษ)
                            </label>
                            <Input
                              value={formValues.genericNameEn}
                              onChange={(event) =>
                                handleFormChange(
                                  "genericNameEn",
                                  event.target.value,
                                )
                              }
                              className="h-9 rounded-full bg-white text-xs"
                              placeholder="เช่น Paracetamol"
                            />
                          </div>
                          <div className="flex min-w-0 flex-col gap-1 md:col-span-1">
                            <label className="text-xs text-slate-600">
                              ชื่อการค้ายา
                            </label>
                            <Input
                              value={formValues.brandName}
                              onChange={(event) =>
                                handleFormChange(
                                  "brandName",
                                  event.target.value,
                                )
                              }
                              className="h-9 rounded-full bg-white text-xs"
                              placeholder="เช่น Tylenol"
                            />
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-600">
                              ข้อบ่งใช้
                            </label>
                            <textarea
                              value={formValues.indications}
                              onChange={(event) =>
                                handleFormChange(
                                  "indications",
                                  event.target.value,
                                )
                              }
                              className="min-h-[60px] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-100"
                              placeholder="อธิบายข้อบ่งใช้ของยา เช่น ลดไข้ บรรเทาอาการปวดศีรษะ"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-600">
                              คำแนะนำการใช้ยา
                            </label>
                            <textarea
                              value={formValues.instructions}
                              onChange={(event) =>
                                handleFormChange(
                                  "instructions",
                                  event.target.value,
                                )
                              }
                              className="min-h-[60px] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-100"
                              placeholder="วิธีการใช้ยา เวลาในการรับประทาน และข้อควรปฏิบัติ"
                            />
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-600">
                              อาการไม่พึงประสงค์จากการใช้ยา
                            </label>
                            <textarea
                              value={formValues.adverseEffects}
                              onChange={(event) =>
                                handleFormChange(
                                  "adverseEffects",
                                  event.target.value,
                                )
                              }
                              className="min-h-[60px] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-100"
                              placeholder="เช่น คลื่นไส้ ผื่นคัน เวียนศีรษะ"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-600">
                              ข้อห้ามใช้
                            </label>
                            <textarea
                              value={formValues.contraindications}
                              onChange={(event) =>
                                handleFormChange(
                                  "contraindications",
                                  event.target.value,
                                )
                              }
                              className="min-h-[60px] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-100"
                              placeholder="เช่น ห้ามใช้ในผู้ที่เคยแพ้ยานี้อย่างรุนแรง"
                            />
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-600">
                              ข้อควรระวังในการใช้
                            </label>
                            <textarea
                              value={formValues.precautions}
                              onChange={(event) =>
                                handleFormChange(
                                  "precautions",
                                  event.target.value,
                                )
                              }
                              className="min-h-[60px] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-100"
                              placeholder="เช่น ใช้ด้วยความระมัดระวังในผู้ป่วยโรคตับหรือไต"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-600">
                              การเก็บรักษา
                            </label>
                            <textarea
                              value={formValues.storage}
                              onChange={(event) =>
                                handleFormChange(
                                  "storage",
                                  event.target.value,
                                )
                              }
                              className="min-h-[60px] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-100"
                              placeholder="เช่น เก็บที่อุณหภูมิห้อง หลีกเลี่ยงความชื้นและแสงแดด"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full px-4 text-xs"
                        onClick={cancelForm}
                      >
                        ยกเลิก
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        className="rounded-full bg-sky-600 px-4 text-xs font-semibold text-white hover:bg-sky-700"
                      >
                        บันทึกข้อมูลยา
                      </Button>
                    </div>
                  </form>
                )}

                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <Button
                    size="sm"
                    className="rounded-full bg-slate-700 px-5 text-xs font-semibold text-white hover:bg-slate-800"
                    type="button"
                  >
                    <Pill className="h-4 w-4" />
                    ข้อมูลยา
                  </Button>

                  <Select
                    value={usageFilter}
                    onValueChange={(value) => {
                      setUsageFilter(value as "all" | UsageType)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="h-9 rounded-full border-none bg-slate-700/90 px-4 text-xs font-medium text-white hover:bg-slate-800/90">
                      <SelectValue placeholder="รูปแบบการใช้" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectItem value="oral">
                        ยากิน
                      </SelectItem>
                      <SelectItem value="topical">
                        ยาใช้ภายนอก
                      </SelectItem>
                      <SelectItem value="all">
                        ทั้งหมด
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="relative ml-auto">
                    <Input
                      type="text"
                      placeholder="ชื่อสามัญทางยาไทยและอังกฤษ/ชื่อการค้า"
                      value={searchTerm}
                      onChange={(event) => {
                        setSearchTerm(event.target.value)
                        setCurrentPage(1)
                      }}
                      className="w-72 rounded-full bg-slate-100 pr-10 text-xs text-slate-800 placeholder:text-slate-400"
                    />
                    <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                  <Button
                    size="sm"
                    className="rounded-full bg-sky-600 px-4 text-xs font-semibold text-white hover:bg-sky-700"
                    type="button"
                    onClick={openCreateForm}
                  >
                    + เพิ่มยาใหม่
                  </Button>
                </div>
                <div className="text-sm text-slate-600">
                  พบข้อมูลยา{" "}
                  <span className="font-semibold text-slate-800">
                    {filteredMedicines.length}
                  </span>{" "}
                  รายการ
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-700">
                      <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                        ชื่อสามัญยา
                      </TableHead>
                      <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                        ชื่อการค้า
                      </TableHead>
                      <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                        รูปแบบการใช้
                      </TableHead>
                      <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                        จัดการ
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMedicines.map((medicine) => (
                      <TableRow
                        key={medicine.id}
                        className="even:bg-slate-50/70"
                      >
                        <TableCell className="px-4 py-3 text-sm font-semibold text-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-200">
                              {medicine.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={medicine.imageUrl}
                                  alt={medicine.genericNameEn}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Pill className="h-5 w-5 text-slate-500" />
                              )}
                            </div>
                            <div>
                              <div>{medicine.genericNameEn}</div>
                              {medicine.genericNameTh && (
                                <div className="text-xs font-normal text-slate-600">
                                  ({medicine.genericNameTh})
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center text-sm text-slate-700">
                          {medicine.brandName}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center text-sm text-slate-700">
                          {USAGE_LABELS[medicine.usageType]}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDelete(medicine.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200"
                              aria-label={`ลบข้อมูลยา ${medicine.genericNameEn}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openViewDetails(medicine.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-slate-50 hover:bg-slate-800"
                              aria-label={`ดูรายละเอียดข้อมูลยา ${medicine.genericNameEn}`}
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginatedMedicines.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-6 text-center text-sm text-slate-500"
                        >
                          ไม่พบข้อมูลยาตามเงื่อนไขที่เลือก
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm font-medium text-slate-700">
                  <span className="text-xs text-slate-500">
                    หน้า {safePage} จาก {totalPages}
                  </span>
                  <div className="flex flex-1 items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => goToPage(safePage - 1)}
                      disabled={!canGoPrev}
                      className="text-sky-700 hover:underline disabled:text-slate-400 disabled:hover:no-underline"
                    >
                      ก่อนหน้า
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, index) => {
                        const page = index + 1
                        const isActive = page === safePage
                        return (
                          <button
                            key={page}
                            type="button"
                            onClick={() => goToPage(page)}
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${
                              isActive
                                ? "bg-sky-700 text-white"
                                : "text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {page}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => goToPage(safePage + 1)}
                      disabled={!canGoNext}
                      className="text-sky-700 hover:underline disabled:text-slate-400 disabled:hover:no-underline"
                    >
                      ถัดไป
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        <Drawer
          open={Boolean(viewingMedicine)}
          onOpenChange={(open) => {
            if (!open) {
              setViewingMedicine(null)
            }
          }}
          direction="right"
        >
          <DrawerContent className="w-full max-w-md border-l">
            {viewingMedicine && (
              <>
                <DrawerHeader>
                  <DrawerTitle className="text-base font-semibold text-slate-800">
                    {viewingMedicine.genericNameEn}
                  </DrawerTitle>
                  <p className="text-xs text-slate-600">
                    {viewingMedicine.genericNameTh && (
                      <span>{viewingMedicine.genericNameTh}</span>
                    )}
                    {viewingMedicine.brandName && (
                      <span>{` • ชื่อการค้า: ${viewingMedicine.brandName}`}</span>
                    )}
                  </p>
                </DrawerHeader>
                <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 text-xs text-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                      {viewingMedicine.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={viewingMedicine.imageUrl}
                          alt={viewingMedicine.genericNameEn}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Pill className="h-8 w-8 text-slate-500" />
                      )}
                    </div>
                    <div className="text-xs text-slate-600">
                      <div className="font-semibold text-slate-800">
                        รูปแบบการใช้ยา:{" "}
                        <span className="font-normal">
                          {USAGE_LABELS[viewingMedicine.usageType]}
                        </span>
                      </div>
                    </div>
                  </div>
                  <section>
                    <h3 className="mb-1 font-semibold text-slate-800">
                      ข้อบ่งใช้
                    </h3>
                    <p className="whitespace-pre-line">
                      {viewingMedicine.indications || "-"}
                    </p>
                  </section>
                  <section>
                    <h3 className="mb-1 font-semibold text-slate-800">
                      คำแนะนำการใช้ยา
                    </h3>
                    <p className="whitespace-pre-line">
                      {viewingMedicine.instructions || "-"}
                    </p>
                  </section>
                  <section>
                    <h3 className="mb-1 font-semibold text-slate-800">
                      อาการไม่พึงประสงค์จากการใช้ยา
                    </h3>
                    <p className="whitespace-pre-line">
                      {viewingMedicine.adverseEffects || "-"}
                    </p>
                  </section>
                  <section>
                    <h3 className="mb-1 font-semibold text-slate-800">
                      ข้อห้ามใช้
                    </h3>
                    <p className="whitespace-pre-line">
                      {viewingMedicine.contraindications || "-"}
                    </p>
                  </section>
                  <section>
                    <h3 className="mb-1 font-semibold text-slate-800">
                      ข้อควรระวังในการใช้
                    </h3>
                    <p className="whitespace-pre-line">
                      {viewingMedicine.precautions || "-"}
                    </p>
                  </section>
                  <section>
                    <h3 className="mb-1 font-semibold text-slate-800">
                      การเก็บรักษา
                    </h3>
                    <p className="whitespace-pre-line">
                      {viewingMedicine.storage || "-"}
                    </p>
                  </section>
                </div>
                <DrawerFooter className="border-t bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-full bg-sky-600 px-4 text-xs font-semibold text-white hover:bg-sky-700"
                      onClick={() => {
                        openEditForm(viewingMedicine.id)
                        setViewingMedicine(null)
                      }}
                    >
                      แก้ไขข้อมูลยา
                    </Button>
                    <DrawerClose asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-full px-4 text-xs"
                      >
                        ปิด
                      </Button>
                    </DrawerClose>
                  </div>
                </DrawerFooter>
              </>
            )}
          </DrawerContent>
        </Drawer>
      </SidebarInset>
    </SidebarProvider>
  )
}
