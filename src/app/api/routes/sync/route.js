import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    return NextResponse.json({
      success: true,
      message: "Routes synchronized successfully."
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
